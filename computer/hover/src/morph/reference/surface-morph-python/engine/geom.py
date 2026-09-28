"""Geometry helpers: easing, sampling, TPS-like landmark warp, triangle raster."""

from __future__ import annotations

from typing import Callable, Dict, Tuple

import numpy as np


EASING: Dict[str, Callable[[np.ndarray], np.ndarray]] = {}


def _reg(name):
    def wrap(fn):
        EASING[name] = fn
        return fn

    return wrap


@_reg("linear")
def ease_linear(t):
    return t


@_reg("smoothstep")
def ease_smoothstep(t):
    return t * t * (3.0 - 2.0 * t)


@_reg("ease_in_out")
def ease_in_out(t):
    return np.where(t < 0.5, 2 * t * t, 1 - (-2 * t + 2) ** 2 / 2)


@_reg("ease_out_cubic")
def ease_out_cubic(t):
    return 1 - (1 - t) ** 3


def apply_easing(t: float, name: str) -> float:
    fn = EASING.get(name, ease_linear)
    return float(fn(np.array([t]))[0])


def sample_bilinear(img: np.ndarray, xs: np.ndarray, ys: np.ndarray) -> np.ndarray:
    """img HxWxC float or uint8, xs/ys same shape. Out of bounds -> 0."""
    h, w = img.shape[:2]
    x0 = np.floor(xs).astype(np.int32)
    y0 = np.floor(ys).astype(np.int32)
    x1 = x0 + 1
    y1 = y0 + 1
    wx = xs - x0
    wy = ys - y0
    x0c = np.clip(x0, 0, w - 1)
    x1c = np.clip(x1, 0, w - 1)
    y0c = np.clip(y0, 0, h - 1)
    y1c = np.clip(y1, 0, h - 1)
    ia = img[y0c, x0c].astype(np.float32)
    ib = img[y0c, x1c].astype(np.float32)
    ic = img[y1c, x0c].astype(np.float32)
    id_ = img[y1c, x1c].astype(np.float32)
    if wx.ndim == 2 and ia.ndim == 3:
        wx = wx[..., None]
        wy = wy[..., None]
    out = (1 - wy) * ((1 - wx) * ia + wx * ib) + wy * ((1 - wx) * ic + wx * id_)
    valid = (xs >= 0) & (xs <= w - 1) & (ys >= 0) & (ys <= h - 1)
    if out.ndim == 3:
        out[~valid] = 0
    else:
        out[~valid] = 0
    return out


def landmark_arrays(landmarks: Dict[str, np.ndarray], names):
    return np.stack([landmarks[n] for n in names], axis=0)


def interpolate_landmarks(a, b, t, names):
    out = {}
    for n in names:
        out[n] = (1.0 - t) * a[n] + t * b[n]
    return out


def delaunay_faces(pts: np.ndarray) -> np.ndarray:
    """Bowyer-Watson-lite via scipy if available, else fan triangulation."""
    try:
        from scipy.spatial import Delaunay

        tri = Delaunay(pts)
        return tri.simplices.astype(np.int32)
    except Exception:
        # fan from centroid-closest
        c = pts.mean(axis=0)
        i0 = int(np.argmin(((pts - c) ** 2).sum(1)))
        faces = []
        n = len(pts)
        for i in range(n):
            faces.append([i0, i, (i + 1) % n])
        return np.array(faces, dtype=np.int32)


def barycentric_raster(h, w, verts, faces):
    """Return maps: face_id (HxW int, -1 empty), bary (HxWx3). Slow-but-ok numpy."""
    face_id = np.full((h, w), -1, dtype=np.int32)
    bary = np.zeros((h, w, 3), dtype=np.float32)
    yy, xx = np.mgrid[0:h, 0:w]
    pts = np.stack([xx, yy], axis=-1).reshape(-1, 2).astype(np.float32)
    for fi, (i0, i1, i2) in enumerate(faces):
        a, b, c = verts[i0], verts[i1], verts[i2]
        v0 = b - a
        v1 = c - a
        den = v0[0] * v1[1] - v1[0] * v0[1]
        if abs(den) < 1e-6:
            continue
        minx = max(int(np.floor(min(a[0], b[0], c[0]))), 0)
        maxx = min(int(np.ceil(max(a[0], b[0], c[0]))), w - 1)
        miny = max(int(np.floor(min(a[1], b[1], c[1]))), 0)
        maxy = min(int(np.ceil(max(a[1], b[1], c[1]))), h - 1)
        if minx > maxx or miny > maxy:
            continue
        sl = (slice(miny, maxy + 1), slice(minx, maxx + 1))
        X = xx[sl].astype(np.float32)
        Y = yy[sl].astype(np.float32)
        v2x = X - a[0]
        v2y = Y - a[1]
        d00 = v0[0] * v0[0] + v0[1] * v0[1]
        d01 = v0[0] * v1[0] + v0[1] * v1[1]
        d11 = v1[0] * v1[0] + v1[1] * v1[1]
        d20 = v0[0] * v2x + v0[1] * v2y
        d21 = v1[0] * v2x + v1[1] * v2y
        inv = 1.0 / (d00 * d11 - d01 * d01 + 1e-8)
        v = (d11 * d20 - d01 * d21) * inv
        ww = (d00 * d21 - d01 * d20) * inv
        u = 1.0 - v - ww
        inside = (u >= -1e-3) & (v >= -1e-3) & (ww >= -1e-3)
        fid = face_id[sl]
        already = fid >= 0
        take = inside & (~already)
        fid[take] = fi
        face_id[sl] = fid
        bb = bary[sl]
        bb[take, 0] = u[take]
        bb[take, 1] = v[take]
        bb[take, 2] = ww[take]
        bary[sl] = bb
    return face_id, bary


def warp_by_mesh(img, src_verts, dst_verts, faces, out_h=None, out_w=None):
    """Inverse-map: for each dest pixel in dest mesh, sample source."""
    h, w = img.shape[:2]
    out_h = out_h or h
    out_w = out_w or w
    face_id, bary = barycentric_raster(out_h, out_w, dst_verts, faces)
    xs = np.zeros((out_h, out_w), dtype=np.float32)
    ys = np.zeros((out_h, out_w), dtype=np.float32)
    valid = face_id >= 0
    for fi, (i0, i1, i2) in enumerate(faces):
        m = face_id == fi
        if not np.any(m):
            continue
        b = bary[m]
        p = b[:, 0:1] * src_verts[i0] + b[:, 1:2] * src_verts[i1] + b[:, 2:3] * src_verts[i2]
        xs[m] = p[:, 0]
        ys[m] = p[:, 1]
    sampled = sample_bilinear(img.astype(np.float32), xs, ys)
    sampled[~valid] = 0
    return sampled, valid, xs, ys
