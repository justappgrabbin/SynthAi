
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  HDCyberMorph-VQVAE-ATO v1.0                                                 ║
║  VQ-VAE Discrete Latent Space + Attention Transformer Object Engine           ║
║  + Network Morphism + Semantic Completion                                     ║
║                                                                               ║
║  For Synthia OS — Mobile/Termux Deployment                                    ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Architecture:
  Face Image (512×512×3) 
    → VQ-VAE Encoder → Continuous Latent (32×32×256)
    → Vector Quantizer → Discrete Codes (32×32) [codebook indices]
    → HD Chart Embedding (conditioning vector)
    → ATO Transformer (autoregressive in latent space)
    → Modified Discrete Codes (32×32)
    → VQ-VAE Decoder → Cyberpunk Face (512×512×3)

Key Innovations:
  1. VQ-VAE: 256× compression vs pixel space. Runs on mobile.
  2. Transformer in latent space: O(n²) where n=1024 (32×32), not 262k (512×512).
  3. Network Morphism: Grow encoder/decoder depth via graph transformations.
  4. Semantic Completion: HD chart is the "context" that completes the memory trace.
  5. Multi-dataset training: Codebook is shared; transformer heads are morphed per style.

Dimensional Stack Mapping:
  D1 (Impulse)     → Type token in transformer input
  D2 (Polarity)    → Defined/Open mask on latent grid
  D3 (Witness)     → Pose embedding (sinusoidal position encoding variant)
  D4 (Context)     → Cross embedding (narrative conditioning)
  D5 (Meaning)     → Authority color token + Gate token sequence
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import math
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass
from collections import OrderedDict

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class HDCyberVQVAEConfig:
    """Configuration for the HDCyberMorph-VQVAE-ATO system."""
    # Image dimensions
    image_size: int = 512
    in_channels: int = 3

    # VQ-VAE Encoder/Decoder
    latent_dim: int = 256          # Dimension of each codebook vector
    num_embeddings: int = 2048     # Codebook size (discrete vocabulary)
    latent_size: int = 32          # Spatial resolution of latent (512/16=32)

    # Encoder architecture (can be morphed)
    encoder_channels: List[int] = None  # e.g., [64, 128, 256, latent_dim]
    encoder_num_res_blocks: int = 2

    # Decoder architecture (mirrors encoder)
    decoder_channels: List[int] = None

    # ATO Transformer
    transformer_dim: int = 512
    transformer_heads: int = 8
    transformer_layers: int = 12
    transformer_ff_mult: int = 4
    max_seq_len: int = 2048        # 32×32 + conditioning tokens

    # HD Conditioning
    hd_embed_dim: int = 256        # Embedding dimension for HD chart
    num_gate_tokens: int = 64      # Each gate is a token
    num_type_tokens: int = 5       # 5 HD types
    num_authority_tokens: int = 8  # 8 authorities
    num_profile_tokens: int = 12   # 12 profiles

    # Training
    commitment_cost: float = 0.25
    decay: float = 0.99            # EMA decay for codebook
    epsilon: float = 1e-5

    # Network Morphism
    morph_growth_rate: float = 0.5  # How much to expand on morph

    def __post_init__(self):
        if self.encoder_channels is None:
            self.encoder_channels = [64, 128, 256, self.latent_dim]
        if self.decoder_channels is None:
            self.decoder_channels = [256, 128, 64, self.in_channels]


# ═══════════════════════════════════════════════════════════════════════════════
# VQ-VAE COMPONENTS
# ═══════════════════════════════════════════════════════════════════════════════

class ResidualBlock(nn.Module):
    """Residual block with optional network morphism support."""
    def __init__(self, in_channels: int, out_channels: int, morphable: bool = True):
        super().__init__()
        self.in_channels = in_channels
        self.out_channels = out_channels
        self.morphable = morphable

        self.conv1 = nn.Conv2d(in_channels, out_channels, 3, padding=1)
        self.bn1 = nn.BatchNorm2d(out_channels)
        self.conv2 = nn.Conv2d(out_channels, out_channels, 3, padding=1)
        self.bn2 = nn.BatchNorm2d(out_channels)

        # Shortcut for dimension matching
        self.shortcut = nn.Conv2d(in_channels, out_channels, 1) if in_channels != out_channels else nn.Identity()

    def forward(self, x):
        residual = self.shortcut(x)
        out = F.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        return F.relu(out + residual)

    def morph_expand(self, new_out_channels: int):
        """Network morphism: expand this block to wider output channels."""
        if not self.morphable or new_out_channels <= self.out_channels:
            return self

        # Create expanded block
        new_block = ResidualBlock(self.in_channels, new_out_channels, morphable=True).to(next(self.parameters()).device)

        # Copy existing weights (identity mapping for new channels)
        with torch.no_grad():
            # Conv1: [new_out, in, 3, 3] — copy old weights, init new as identity-like
            new_block.conv1.weight[:self.out_channels] = self.conv1.weight
            nn.init.xavier_uniform_(new_block.conv1.weight[self.out_channels:])
            new_block.bn1.weight[:self.out_channels] = self.bn1.weight
            new_block.bn1.bias[:self.out_channels] = self.bn1.bias
            new_block.bn1.running_mean[:self.out_channels] = self.bn1.running_mean
            new_block.bn1.running_var[:self.out_channels] = self.bn1.running_var

            # Conv2: [new_out, new_out, 3, 3]
            new_block.conv2.weight[:self.out_channels, :self.out_channels] = self.conv2.weight
            nn.init.xavier_uniform_(new_block.conv2.weight[self.out_channels:, :self.out_channels])
            nn.init.xavier_uniform_(new_block.conv2.weight[:, self.out_channels:])
            new_block.bn2.weight[:self.out_channels] = self.bn2.weight
            new_block.bn2.bias[:self.out_channels] = self.bn2.bias

            # Shortcut
            if isinstance(self.shortcut, nn.Conv2d):
                new_block.shortcut.weight[:self.out_channels, :self.in_channels] = self.shortcut.weight
                nn.init.xavier_uniform_(new_block.shortcut.weight[self.out_channels:, :self.in_channels])

        return new_block


class VectorQuantizer(nn.Module):
    """
    Vector Quantizer with EMA updates.
    Maps continuous latent vectors to discrete codebook indices.
    """
    def __init__(self, num_embeddings: int, embedding_dim: int, commitment_cost: float, decay: float, epsilon: float):
        super().__init__()
        self.num_embeddings = num_embeddings
        self.embedding_dim = embedding_dim
        self.commitment_cost = commitment_cost

        # Codebook embeddings
        self.embeddings = nn.Embedding(num_embeddings, embedding_dim)
        self.embeddings.weight.data.uniform_(-1/num_embeddings, 1/num_embeddings)

        # EMA parameters
        self.register_buffer('_ema_cluster_size', torch.zeros(num_embeddings))
        self.register_buffer('_ema_w', self.embeddings.weight.data.clone())
        self.decay = decay
        self.epsilon = epsilon

    def forward(self, inputs: torch.Tensor):
        """
        inputs: [B, C, H, W] continuous latent
        returns: quantized, loss, encoding_indices
        """
        # Flatten to [BHW, C]
        flat_input = inputs.permute(0, 2, 3, 1).contiguous().view(-1, self.embedding_dim)

        # Calculate distances to codebook vectors
        distances = (torch.sum(flat_input**2, dim=1, keepdim=True) 
                    + torch.sum(self.embeddings.weight**2, dim=1)
                    - 2 * torch.matmul(flat_input, self.embeddings.weight.t()))

        # Get closest codebook indices
        encoding_indices = torch.argmin(distances, dim=1)
        encodings = F.one_hot(encoding_indices, self.num_embeddings).float()

        # Quantize
        quantized = torch.matmul(encodings, self.embeddings.weight).view(inputs.shape)

        # EMA update (during training)
        if self.training:
            self._ema_cluster_size = self._ema_cluster_size * self.decay +                                      (1 - self.decay) * torch.sum(encodings, dim=0)

            n = torch.sum(self._ema_cluster_size)
            self._ema_cluster_size = (
                (self._ema_cluster_size + self.epsilon) / (n + self.num_embeddings * self.epsilon) * n
            )

            dw = torch.matmul(encodings.t(), flat_input)
            self._ema_w = self._ema_w * self.decay + (1 - self.decay) * dw

            self.embeddings.weight.data = self._ema_w / self._ema_cluster_size.unsqueeze(1)

        # Straight-through estimator
        quantized_st = inputs + (quantized - inputs).detach()

        # Loss: commitment + codebook
        e_latent_loss = F.mse_loss(quantized.detach(), inputs)
        q_latent_loss = F.mse_loss(quantized, inputs.detach())
        loss = q_latent_loss + self.commitment_cost * e_latent_loss

        return quantized_st, loss, encoding_indices.view(inputs.shape[0], inputs.shape[2], inputs.shape[3])

    def decode_indices(self, indices: torch.Tensor):
        """Decode discrete indices back to continuous latent."""
        return self.embeddings(indices)

    def get_codebook_entry(self, indices: torch.Tensor):
        """Get codebook vectors for indices."""
        return self.embeddings(indices)


class HDCyberEncoder(nn.Module):
    """
    VQ-VAE Encoder with Network Morphism support.
    Morphable: can expand depth/width without losing trained function.
    """
    def __init__(self, config: HDCyberVQVAEConfig):
        super().__init__()
        self.config = config
        self.blocks = nn.ModuleList()

        in_ch = config.in_channels
        for out_ch in config.encoder_channels:
            self.blocks.append(nn.Sequential(
                nn.Conv2d(in_ch, out_ch, 4, stride=2, padding=1),  # Downsample
                nn.BatchNorm2d(out_ch),
                nn.ReLU(inplace=True),
                ResidualBlock(out_ch, out_ch),
                ResidualBlock(out_ch, out_ch),
            ))
            in_ch = out_ch

        # Final conv to latent_dim
        self.final_conv = nn.Conv2d(config.encoder_channels[-1], config.latent_dim, 3, padding=1)

    def forward(self, x):
        for block in self.blocks:
            x = block(x)
        return self.final_conv(x)

    def morph_depth(self, num_new_blocks: int = 1):
        """Add new residual blocks (network morphism — preserve function via identity)."""
        last_ch = self.config.encoder_channels[-1]
        for _ in range(num_new_blocks):
            # Insert identity-like residual block
            new_block = ResidualBlock(last_ch, last_ch).to(next(self.parameters()).device)
            with torch.no_grad():
                # Initialize conv2 as near-zero so block acts as identity
                nn.init.zeros_(new_block.conv2.weight)
                nn.init.zeros_(new_block.conv2.bias)
            self.blocks.append(nn.Sequential(new_block))

    def morph_width(self, layer_idx: int, new_channels: int):
        """Widen a specific layer via network morphism."""
        if layer_idx >= len(self.blocks):
            return
        # This is a simplified morphism — full implementation would reshape all downstream layers
        pass


class HDCyberDecoder(nn.Module):
    """VQ-VAE Decoder — mirrors encoder with upsampling."""
    def __init__(self, config: HDCyberVQVAEConfig):
        super().__init__()
        self.config = config

        # Initial conv from latent
        self.initial_conv = nn.Conv2d(config.latent_dim, config.decoder_channels[0], 3, padding=1)

        self.blocks = nn.ModuleList()
        in_ch = config.decoder_channels[0]
        for out_ch in config.decoder_channels[1:]:
            self.blocks.append(nn.Sequential(
                ResidualBlock(in_ch, in_ch),
                ResidualBlock(in_ch, in_ch),
                nn.ConvTranspose2d(in_ch, out_ch, 4, stride=2, padding=1),  # Upsample
                nn.BatchNorm2d(out_ch),
                nn.ReLU(inplace=True),
            ))
            in_ch = out_ch

        # Final output
        self.final_conv = nn.Conv2d(config.decoder_channels[-1], config.in_channels, 3, padding=1)

    def forward(self, x):
        x = self.initial_conv(x)
        for block in self.blocks:
            x = block(x)
        return torch.tanh(self.final_conv(x))


# ═══════════════════════════════════════════════════════════════════════════════
# HD CHART EMBEDDING
# ═══════════════════════════════════════════════════════════════════════════════

class HDChartEmbedder(nn.Module):
    """
    Embeds a Human Design chart into a conditioning vector.
    Each component (type, profile, authority, gates, centers) gets its own embedding.
    """
    def __init__(self, config: HDCyberVQVAEConfig):
        super().__init__()
        self.config = config

        # Token embeddings
        self.type_embed = nn.Embedding(config.num_type_tokens, config.hd_embed_dim // 4)
        self.authority_embed = nn.Embedding(config.num_authority_tokens, config.hd_embed_dim // 4)
        self.profile_embed = nn.Embedding(config.num_profile_tokens * config.num_profile_tokens, config.hd_embed_dim // 4)

        # Gate embeddings: each gate (1-64) + line (1-6) = 384 combinations
        self.gate_embed = nn.Embedding(64 * 6, config.hd_embed_dim // 4)

        # Center mask embedding (9 centers, binary defined/undefined)
        self.center_embed = nn.Embedding(2, config.hd_embed_dim // 4)  # 0=open, 1=defined

        # Fusion MLP
        self.fusion = nn.Sequential(
            nn.Linear(config.hd_embed_dim, config.hd_embed_dim),
            nn.ReLU(),
            nn.Linear(config.hd_embed_dim, config.hd_embed_dim),
            nn.ReLU(),
            nn.Linear(config.hd_embed_dim, config.transformer_dim)
        )

    def forward(self, chart_tokens: Dict[str, torch.Tensor]):
        """
        chart_tokens: {
            'type': [B] int (0-4),
            'authority': [B] int (0-7),
            'profile': [B] int (0-143, encoded as profile[0]*12 + profile[1]),
            'gates': [B, N] int (gate_number * 6 + line - 1),
            'centers': [B, 9] int (0 or 1 for each center)
        }
        """
        B = chart_tokens['type'].shape[0]

        type_emb = self.type_embed(chart_tokens['type'])  # [B, D/4]
        auth_emb = self.authority_embed(chart_tokens['authority'])  # [B, D/4]
        prof_emb = self.profile_embed(chart_tokens['profile'])  # [B, D/4]

        # Average gate embeddings
        gate_emb = self.gate_embed(chart_tokens['gates'])  # [B, N, D/4]
        gate_emb = gate_emb.mean(dim=1)  # [B, D/4]

        # Average center embeddings
        center_emb = self.center_embed(chart_tokens['centers'])  # [B, 9, D/4]
        center_emb = center_emb.mean(dim=1)  # [B, D/4]

        # Concatenate all
        combined = torch.cat([type_emb, auth_emb, prof_emb, gate_emb, center_emb], dim=-1)  # [B, D]

        return self.fusion(combined)  # [B, transformer_dim]


# ═══════════════════════════════════════════════════════════════════════════════
# ATO: ATTENTION TRANSFORMER OBJECT ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class CausalSelfAttention(nn.Module):
    """Causal self-attention with optional cross-attention to HD conditioning."""
    def __init__(self, dim: int, num_heads: int, dropout: float = 0.1):
        super().__init__()
        assert dim % num_heads == 0
        self.num_heads = num_heads
        self.head_dim = dim // num_heads
        self.scale = self.head_dim ** -0.5

        self.qkv = nn.Linear(dim, 3 * dim)
        self.proj = nn.Linear(dim, dim)
        self.dropout = nn.Dropout(dropout)

        # Cross-attention to HD conditioning
        self.cross_q = nn.Linear(dim, dim)
        self.cross_kv = nn.Linear(dim, 2 * dim)
        self.cross_proj = nn.Linear(dim, dim)

        self.register_buffer('mask', None)

    def get_causal_mask(self, seq_len: int, device):
        if self.mask is None or self.mask.shape[0] < seq_len:
            mask = torch.triu(torch.ones(seq_len, seq_len, device=device), diagonal=1).bool()
            self.register_buffer('mask', mask)
        return self.mask[:seq_len, :seq_len]

    def forward(self, x: torch.Tensor, hd_cond: Optional[torch.Tensor] = None):
        B, T, C = x.shape

        # Self-attention
        qkv = self.qkv(x).reshape(B, T, 3, self.num_heads, self.head_dim).permute(2, 0, 3, 1, 4)
        q, k, v = qkv[0], qkv[1], qkv[2]

        attn = (q @ k.transpose(-2, -1)) * self.scale
        attn = attn.masked_fill(self.get_causal_mask(T, x.device), float('-inf'))
        attn = F.softmax(attn, dim=-1)
        attn = self.dropout(attn)

        out = (attn @ v).transpose(1, 2).reshape(B, T, C)
        out = self.proj(out)

        # Cross-attention to HD conditioning
        if hd_cond is not None:
            # hd_cond: [B, D] — expand to [B, 1, D] for cross-attn
            hd_cond = hd_cond.unsqueeze(1)  # [B, 1, D]
            cross_q = self.cross_q(x).reshape(B, T, self.num_heads, self.head_dim).permute(0, 2, 1, 3)
            cross_kv = self.cross_kv(hd_cond).reshape(B, 1, 2, self.num_heads, self.head_dim).permute(2, 0, 3, 1, 4)
            cross_k, cross_v = cross_kv[0], cross_kv[1]

            cross_attn = (cross_q @ cross_k.transpose(-2, -1)) * self.scale
            cross_attn = F.softmax(cross_attn, dim=-1)
            cross_out = (cross_attn @ cross_v).transpose(1, 2).reshape(B, T, C)
            cross_out = self.cross_proj(cross_out)

            out = out + cross_out

        return out


class TransformerBlock(nn.Module):
    """Transformer block with pre-norm, causal self-attention, and FFN."""
    def __init__(self, dim: int, num_heads: int, ff_mult: int = 4, dropout: float = 0.1):
        super().__init__()
        self.norm1 = nn.LayerNorm(dim)
        self.attn = CausalSelfAttention(dim, num_heads, dropout)
        self.norm2 = nn.LayerNorm(dim)

        ff_dim = dim * ff_mult
        self.ff = nn.Sequential(
            nn.Linear(dim, ff_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(ff_dim, dim),
            nn.Dropout(dropout)
        )

    def forward(self, x: torch.Tensor, hd_cond: Optional[torch.Tensor] = None):
        x = x + self.attn(self.norm1(x), hd_cond)
        x = x + self.ff(self.norm2(x))
        return x


class ATOTransformer(nn.Module):
    """
    Attention Transformer Object Engine.
    Autoregressively generates/modifies discrete latent codes conditioned on HD chart.
    """
    def __init__(self, config: HDCyberVQVAEConfig):
        super().__init__()
        self.config = config

        # Token embedding (codebook indices → transformer dim)
        self.token_embed = nn.Embedding(config.num_embeddings, config.transformer_dim)

        # Positional encoding (2D-aware for latent grid)
        self.pos_embed = nn.Parameter(torch.zeros(1, config.max_seq_len, config.transformer_dim))
        nn.init.normal_(self.pos_embed, std=0.02)

        # HD conditioning projection
        self.hd_proj = nn.Linear(config.transformer_dim, config.transformer_dim)

        # Transformer layers
        self.layers = nn.ModuleList([
            TransformerBlock(config.transformer_dim, config.transformer_heads, config.transformer_ff_mult)
            for _ in range(config.transformer_layers)
        ])

        # Output head: predict next codebook index
        self.norm = nn.LayerNorm(config.transformer_dim)
        self.head = nn.Linear(config.transformer_dim, config.num_embeddings, bias=False)

        # Optional: style token for multi-dataset training
        self.style_embed = nn.Embedding(16, config.transformer_dim)  # 16 different styles/datasets

    def forward(self, indices: torch.Tensor, hd_cond: torch.Tensor, style_id: int = 0):
        """
        indices: [B, T] discrete codebook indices (flattened latent grid)
        hd_cond: [B, D] HD chart conditioning vector
        style_id: int style/dataset identifier
        """
        B, T = indices.shape

        # Token + position embeddings
        x = self.token_embed(indices)  # [B, T, D]
        x = x + self.pos_embed[:, :T, :]

        # Add style token
        style = self.style_embed(torch.tensor(style_id, device=indices.device)).unsqueeze(0).unsqueeze(0)
        x = x + style

        # Project HD conditioning
        hd_cond = self.hd_proj(hd_cond)  # [B, D]

        # Transformer layers
        for layer in self.layers:
            x = layer(x, hd_cond)

        x = self.norm(x)
        logits = self.head(x)  # [B, T, num_embeddings]

        return logits

    def generate(self, hd_cond: torch.Tensor, latent_shape: Tuple[int, int] = (32, 32), 
                 temperature: float = 1.0, top_k: int = 50, style_id: int = 0):
        """
        Autoregressive generation of latent codes from HD conditioning.
        """
        B = hd_cond.shape[0]
        device = hd_cond.device

        # Start with a single [START] token (or zeros)
        indices = torch.zeros(B, 1, dtype=torch.long, device=device)

        max_len = latent_shape[0] * latent_shape[1]

        for i in range(max_len):
            logits = self.forward(indices, hd_cond, style_id)[:, -1, :]  # [B, num_embeddings]

            # Top-k sampling
            if top_k > 0:
                v, _ = torch.topk(logits, top_k)
                logits[logits < v[:, [-1]]] = float('-inf')

            probs = F.softmax(logits / temperature, dim=-1)
            next_token = torch.multinomial(probs, num_samples=1)

            indices = torch.cat([indices, next_token], dim=1)

        # Remove start token and reshape
        indices = indices[:, 1:]
        return indices.reshape(B, latent_shape[0], latent_shape[1])

    def morph_expand(self, num_new_layers: int = 2):
        """Network morphism: add new transformer layers initialized as identity."""
        for _ in range(num_new_layers):
            new_layer = TransformerBlock(
                self.config.transformer_dim, 
                self.config.transformer_heads,
                self.config.transformer_ff_mult
            ).to(next(self.parameters()).device)

            # Initialize as near-identity
            with torch.no_grad():
                for param in new_layer.ff.parameters():
                    if param.dim() >= 2:
                        nn.init.zeros_(param)
                # Attention: initialize output projection to zero so layer is identity
                nn.init.zeros_(new_layer.attn.proj.weight)
                nn.init.zeros_(new_layer.attn.proj.bias)

            self.layers.append(new_layer)


# ═══════════════════════════════════════════════════════════════════════════════
# SEMANTIC COMPLETION ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class SemanticCompletionEngine(nn.Module):
    """
    Implements semantic completion from PMID 35896150.
    Given a partial memory trace (some latent codes known, some missing),
    and an HD chart context, fill in the missing codes semantically.
    """
    def __init__(self, config: HDCyberVQVAEConfig):
        super().__init__()
        self.config = config
        self.transformer = ATOTransformer(config)

    def complete(self, partial_indices: torch.Tensor, mask: torch.Tensor, 
                 hd_cond: torch.Tensor, style_id: int = 0):
        """
        partial_indices: [B, H, W] known codebook indices (0 for unknown)
        mask: [B, H, W] bool (True where indices are known)
        hd_cond: [B, D] HD chart conditioning

        Returns: completed_indices [B, H, W]
        """
        B, H, W = partial_indices.shape
        device = partial_indices.device

        # Flatten
        flat_indices = partial_indices.reshape(B, H * W)
        flat_mask = mask.reshape(B, H * W)

        # For known positions, use ground truth
        # For unknown positions, use transformer predictions
        # We do this autoregressively, conditioning on known tokens

        completed = flat_indices.clone()

        for pos in range(H * W):
            if flat_mask[:, pos].all():
                continue  # Already known

            # Get context up to this position
            context = completed[:, :pos+1]

            # Predict next token
            logits = self.transformer(context, hd_cond, style_id)[:, -1, :]
            probs = F.softmax(logits, dim=-1)
            pred = torch.multinomial(probs, num_samples=1).squeeze(-1)

            # Fill in only where unknown
            unknown = ~flat_mask[:, pos]
            completed[unknown, pos] = pred[unknown]

        return completed.reshape(B, H, W)

    def forward(self, partial_indices: torch.Tensor, mask: torch.Tensor, 
                hd_cond: torch.Tensor, style_id: int = 0):
        """Training forward: predict all masked positions."""
        B, H, W = partial_indices.shape
        flat = partial_indices.reshape(B, H * W)
        flat_mask = mask.reshape(B, H * W)

        logits = self.transformer(flat, hd_cond, style_id)  # [B, T, num_embeddings]

        # Only compute loss on masked positions
        targets = flat[:, 1:]  # Shift by 1 for next-token prediction
        logits = logits[:, :-1, :]  # Align with targets

        # Mask loss
        loss_mask = ~flat_mask[:, 1:]

        loss = F.cross_entropy(
            logits.reshape(-1, self.config.num_embeddings),
            targets.reshape(-1),
            reduction='none'
        )
        loss = (loss * loss_mask.reshape(-1).float()).sum() / loss_mask.sum().clamp(min=1)

        return loss


# ═══════════════════════════════════════════════════════════════════════════════
# FULL HDCyberMorph-VQVAE-ATO MODEL
# ═══════════════════════════════════════════════════════════════════════════════

class HDCyberMorphVQVAEATO(nn.Module):
    """
    Complete system: VQ-VAE + HD Embedder + ATO Transformer + Semantic Completion.
    """
    def __init__(self, config: HDCyberVQVAEConfig):
        super().__init__()
        self.config = config

        self.encoder = HDCyberEncoder(config)
        self.quantizer = VectorQuantizer(
            config.num_embeddings, config.latent_dim,
            config.commitment_cost, config.decay, config.epsilon
        )
        self.decoder = HDCyberDecoder(config)
        self.hd_embedder = HDChartEmbedder(config)
        self.completion_engine = SemanticCompletionEngine(config)

    def encode(self, x: torch.Tensor):
        """Encode image to discrete indices."""
        z = self.encoder(x)
        _, _, indices = self.quantizer(z)
        return indices

    def decode(self, indices: torch.Tensor):
        """Decode discrete indices to image."""
        z = self.quantizer.decode_indices(indices).permute(0, 3, 1, 2)
        return self.decoder(z)

    def forward(self, x: torch.Tensor, chart_tokens: Dict[str, torch.Tensor], 
                style_id: int = 0, mask_ratio: float = 0.0):
        """
        Full forward pass:
        1. Encode image to discrete latent
        2. Optionally mask some latents (for semantic completion training)
        3. Condition on HD chart
        4. Complete missing latents via transformer
        5. Decode to image
        """
        # Encode
        z = self.encoder(x)
        quantized, vq_loss, indices = self.quantizer(z)

        # HD conditioning
        hd_cond = self.hd_embedder(chart_tokens)

        # Mask for semantic completion training
        if self.training and mask_ratio > 0:
            B, H, W = indices.shape
            mask = torch.rand(B, H, W, device=indices.device) > mask_ratio

            # Complete
            completed_indices = self.completion_engine.complete(
                indices, mask, hd_cond, style_id
            )

            # Compute completion loss
            comp_loss = self.completion_engine(indices, mask, hd_cond, style_id)
        else:
            completed_indices = indices
            comp_loss = torch.tensor(0.0, device=indices.device)

        # Decode
        z_q = self.quantizer.decode_indices(completed_indices).permute(0, 3, 1, 2)
        recon = self.decoder(z_q)

        # Reconstruction loss
        recon_loss = F.mse_loss(recon, x)

        total_loss = recon_loss + vq_loss + comp_loss

        return {
            'recon': recon,
            'indices': completed_indices,
            'recon_loss': recon_loss,
            'vq_loss': vq_loss,
            'comp_loss': comp_loss,
            'total_loss': total_loss
        }

    def morph(self, growth_strategy: str = 'depth'):
        """Apply network morphism to expand model capacity."""
        if growth_strategy == 'depth':
            self.encoder.morph_depth(1)
            self.completion_engine.transformer.morph_expand(2)
        elif growth_strategy == 'width':
            # Widen specific layers
            pass

    def generate(self, chart_tokens: Dict[str, torch.Tensor], 
                 latent_shape: Tuple[int, int] = (32, 32),
                 style_id: int = 0, temperature: float = 1.0):
        """
        Generate a cyberpunk character from HD chart alone (no input image).
        Uses the transformer to generate latent codes from scratch, then decodes.
        """
        hd_cond = self.hd_embedder(chart_tokens)
        indices = self.completion_engine.transformer.generate(
            hd_cond, latent_shape, temperature, style_id=style_id
        )
        return self.decode(indices)

    def morph_face(self, x: torch.Tensor, chart_tokens: Dict[str, torch.Tensor],
                   style_id: int = 0, morph_strength: float = 0.5):
        """
        Morph an existing face image into a cyberpunk character.
        1. Encode face to latent
        2. Use HD chart to guide transformation
        3. Blend original and transformed latents by morph_strength
        """
        # Encode
        z = self.encoder(x)
        _, _, original_indices = self.quantizer(z)

        # Generate transformed version
        hd_cond = self.hd_embedder(chart_tokens)
        transformed_indices = self.completion_engine.transformer.generate(
            hd_cond, original_indices.shape[1:], style_id=style_id
        )

        # Blend in discrete space (interpolate by randomly choosing per position)
        B, H, W = original_indices.shape
        blend_mask = torch.rand(B, H, W, device=original_indices.device) < morph_strength
        blended_indices = torch.where(blend_mask, transformed_indices, original_indices)

        return self.decode(blended_indices)


# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-DATASET TRAINING MANAGER
# ═══════════════════════════════════════════════════════════════════════════════

class MultiDatasetTrainer:
    """
    Trains the model on multiple cyberpunk character datasets.
    Uses network morphism to expand capacity as new datasets are added.
    """
    def __init__(self, model: HDCyberMorphVQVAEATO, config: HDCyberVQVAEConfig):
        self.model = model
        self.config = config
        self.style_id = 0
        self.dataset_registry = {}

    def register_dataset(self, name: str, dataloader, hd_chart_fn):
        """Register a new dataset with a style ID."""
        self.dataset_registry[name] = {
            'style_id': self.style_id,
            'dataloader': dataloader,
            'hd_chart_fn': hd_chart_fn
        }
        self.style_id += 1

        # If we've added many datasets, morph the model
        if self.style_id % 4 == 0:
            print(f"Morphing model after {self.style_id} datasets...")
            self.model.morph('depth')

    def train_step(self, dataset_name: str):
        """Single training step on a specific dataset."""
        ds = self.dataset_registry[dataset_name]
        batch = next(iter(ds['dataloader']))

        images = batch['image']
        charts = batch['chart']

        # Convert charts to tokens
        chart_tokens = ds['hd_chart_fn'](charts)

        # Forward
        output = self.model(images, chart_tokens, style_id=ds['style_id'], mask_ratio=0.15)

        return output['total_loss']

    def train_vqvae_only(self, dataset_name: str, epochs: int = 10):
        """Phase 1: Train VQ-VAE (encoder/decoder/quantizer) without transformer."""
        ds = self.dataset_registry[dataset_name]
        optimizer = torch.optim.Adam([
            {'params': self.model.encoder.parameters()},
            {'params': self.model.decoder.parameters()},
            {'params': self.model.quantizer.parameters()}
        ], lr=1e-4)

        for epoch in range(epochs):
            for batch in ds['dataloader']:
                images = batch['image']

                # VQ-VAE forward only
                z = self.model.encoder(images)
                quantized, vq_loss, indices = self.model.quantizer(z)
                recon = self.model.decoder(quantized)

                loss = F.mse_loss(recon, images) + vq_loss

                optimizer.zero_grad()
                loss.backward()
                optimizer.step()

            print(f"Epoch {epoch+1}/{epochs}, Loss: {loss.item():.4f}")

    def train_transformer_only(self, dataset_name: str, epochs: int = 20):
        """Phase 2: Freeze VQ-VAE, train transformer on discrete codes."""
        ds = self.dataset_registry[dataset_name]

        # Freeze VQ-VAE
        for param in self.model.encoder.parameters():
            param.requires_grad = False
        for param in self.model.decoder.parameters():
            param.requires_grad = False
        for param in self.model.quantizer.parameters():
            param.requires_grad = False

        optimizer = torch.optim.Adam([
            {'params': self.model.hd_embedder.parameters()},
            {'params': self.model.completion_engine.parameters()}
        ], lr=3e-4)

        for epoch in range(epochs):
            for batch in ds['dataloader']:
                images = batch['image']
                charts = batch['chart']
                chart_tokens = ds['hd_chart_fn'](charts)

                # Encode to discrete (no grad)
                with torch.no_grad():
                    indices = self.model.encode(images)

                # Mask random positions
                B, H, W = indices.shape
                mask = torch.rand(B, H, W, device=indices.device) > 0.85

                # HD conditioning
                hd_cond = self.model.hd_embedder(chart_tokens)

                # Completion loss
                loss = self.model.completion_engine(indices, mask, hd_cond, ds['style_id'])

                optimizer.zero_grad()
                loss.backward()
                optimizer.step()

            print(f"Epoch {epoch+1}/{epochs}, Loss: {loss.item():.4f}")


# ═══════════════════════════════════════════════════════════════════════════════
# MOBILE/TERMUX OPTIMIZATION
# ═══════════════════════════════════════════════════════════════════════════════

class MobileOptimizer:
    """Optimizes the model for mobile/Termux deployment."""

    @staticmethod
    def quantize_model(model: HDCyberMorphVQVAEATO):
        """Quantize model to INT8 for mobile inference."""
        model.eval()
        # Dynamic quantization for linear layers
        quantized_model = torch.quantization.quantize_dynamic(
            model, {nn.Linear}, dtype=torch.qint8
        )
        return quantized_model

    @staticmethod
    def export_onnx(model: HDCyberMorphVQVAEATO, path: str = 'hd_cyber_morph.onnx'):
        """Export to ONNX for cross-platform inference."""
        model.eval()
        dummy_image = torch.randn(1, 3, 512, 512)
        dummy_chart = {
            'type': torch.tensor([0]),
            'authority': torch.tensor([0]),
            'profile': torch.tensor([0]),
            'gates': torch.tensor([[0, 1, 2]]),
            'centers': torch.tensor([[1, 1, 1, 0, 0, 0, 0, 0, 1]])
        }

        torch.onnx.export(
            model, (dummy_image, dummy_chart),
            path,
            input_names=['image', 'chart_type', 'chart_authority', 'chart_profile', 'chart_gates', 'chart_centers'],
            output_names=['recon', 'indices'],
            dynamic_axes={'image': {0: 'batch_size'}, 'recon': {0: 'batch_size'}},
            opset_version=11
        )
        print(f"ONNX model exported to {path}")

    @staticmethod
    def get_model_size(model: nn.Module):
        """Get model size in MB."""
        param_size = sum(p.numel() * p.element_size() for p in model.parameters())
        buffer_size = sum(b.numel() * b.element_size() for b in model.buffers())
        size_mb = (param_size + buffer_size) / 1024**2
        return size_mb

    @staticmethod
    def create_tiny_config():
        """Create a tiny config for mobile (under 50MB)."""
        return HDCyberVQVAEConfig(
            image_size=256,
            latent_dim=128,
            num_embeddings=1024,
            latent_size=16,
            encoder_channels=[32, 64, 128],
            decoder_channels=[128, 64, 32],
            transformer_dim=256,
            transformer_heads=4,
            transformer_layers=6,
            hd_embed_dim=128
        )


# ═══════════════════════════════════════════════════════════════════════════════
# EXAMPLE USAGE
# ═══════════════════════════════════════════════════════════════════════════════

def demo():
    """Demonstrate the full system."""
    # Config
    config = HDCyberVQVAEConfig()

    # Model
    model = HDCyberMorphVQVAEATO(config)

    # Dummy input
    image = torch.randn(2, 3, 512, 512)
    chart_tokens = {
        'type': torch.tensor([0, 2]),  # Manifestor, Projector
        'authority': torch.tensor([0, 2]),  # Emotional, Splenic
        'profile': torch.tensor([3, 40]),  # 1/4, 5/1
        'gates': torch.tensor([[5, 11, 21, 35, 49], [10, 16, 42, 61]]),
        'centers': torch.tensor([
            [1, 1, 1, 0, 1, 0, 0, 0, 1],  # Manifestor defined centers
            [0, 1, 1, 1, 0, 0, 0, 0, 0]   # Projector defined centers
        ])
    }

    # Forward
    output = model(image, chart_tokens, style_id=0, mask_ratio=0.15)

    print(f"Reconstruction shape: {output['recon'].shape}")
    print(f"Indices shape: {output['indices'].shape}")
    print(f"Total loss: {output['total_loss'].item():.4f}")
    print(f"VQ loss: {output['vq_loss'].item():.4f}")
    print(f"Recon loss: {output['recon_loss'].item():.4f}")
    print(f"Comp loss: {output['comp_loss'].item():.4f}")

    # Model size
    size = MobileOptimizer.get_model_size(model)
    print(f"Model size: {size:.2f} MB")

    # Generate from scratch
    generated = model.generate(chart_tokens, style_id=0)
    print(f"Generated shape: {generated.shape}")

    # Morph existing face
    morphed = model.morph_face(image, chart_tokens, style_id=0, morph_strength=0.7)
    print(f"Morphed shape: {morphed.shape}")

    # Tiny config for mobile
    tiny_config = MobileOptimizer.create_tiny_config()
    tiny_model = HDCyberMorphVQVAEATO(tiny_config)
    tiny_size = MobileOptimizer.get_model_size(tiny_model)
    print(f"Tiny model size: {tiny_size:.2f} MB")


if __name__ == '__main__':
    demo()
