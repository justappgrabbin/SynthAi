"""Morph Engine: state-node sprite interpolation via persistent transition edges."""

from .pipeline import MorphEngine, morph
from .edge import TransitionEdge

__all__ = ["MorphEngine", "morph", "TransitionEdge"]
