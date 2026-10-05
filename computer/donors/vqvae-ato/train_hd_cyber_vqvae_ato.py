#!/usr/bin/env python3
"""
HDCyberMorph-VQVAE-ATO Training Pipeline
=========================================

Multi-phase training strategy:
  Phase 1: VQ-VAE pretraining (reconstruction only)
  Phase 2: Transformer training (frozen VQ-VAE, train autoregressive model)
  Phase 3: Joint fine-tuning (end-to-end with semantic completion)
  Phase 4: Network morphism (expand capacity for new datasets)

Supports multiple cyberpunk character datasets:
  - Dataset 0: Base cyberpunk portraits
  - Dataset 1: Neon/cityscape characters  
  - Dataset 2: Industrial/mech characters
  - Dataset 3: Biopunk/organic characters
  - Dataset 4: Mirror/chameleon characters
  etc.

Each dataset gets a style token. Network morphism expands the model
as new datasets are added without catastrophic forgetting.
"""

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image
import json
import os
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import argparse
from tqdm import tqdm

from hd_cyber_vqvae_ato import (
    HDCyberMorphVQVAEATO, HDCyberVQVAEConfig,
    MobileOptimizer, MultiDatasetTrainer
)


# ═══════════════════════════════════════════════════════════════════════════════
# DATASET
# ═══════════════════════════════════════════════════════════════════════════════

class CyberpunkFaceDataset(Dataset):
    """
    Dataset of face images paired with HD chart data.

    Directory structure:
      data/
        images/
          0001.jpg
          0002.jpg
          ...
        charts/
          0001.json
          0002.json
          ...

    Chart JSON format:
      {
        "type": "Manifestor",
        "profile": [1, 4],
        "authority": "Emotional",
        "defined_centers": ["Heart", "Throat", "Head", "Ajna", "Root"],
        "conscious_gates": [{"number": 6, "line": 4}, ...],
        "cross": "Cross of Eden"
      }
    """

    TYPE_MAP = {t: i for i, t in enumerate([
        'Manifestor', 'Generator', 'ManifestingGenerator', 'Projector', 'Reflector'
    ])}

    AUTHORITY_MAP = {a: i for i, a in enumerate([
        'Emotional', 'Sacral', 'Splenic', 'Ego', 'SelfProjected', 'Mental', 'Lunar', 'Environmental'
    ])}

    CENTER_MAP = {c: i for i, c in enumerate([
        'Head', 'Ajna', 'Throat', 'G', 'Heart', 'SolarPlexus', 'Sacral', 'Spleen', 'Root'
    ])}

    def __init__(self, root_dir: str, image_size: int = 512, max_gates: int = 13):
        self.root_dir = Path(root_dir)
        self.image_size = image_size
        self.max_gates = max_gates

        self.image_dir = self.root_dir / 'images'
        self.chart_dir = self.root_dir / 'charts'

        self.samples = []
        for img_path in sorted(self.image_dir.glob('*.jpg')):
            chart_path = self.chart_dir / (img_path.stem + '.json')
            if chart_path.exists():
                self.samples.append((img_path, chart_path))

        self.transform = transforms.Compose([
            transforms.Resize(image_size),
            transforms.CenterCrop(image_size),
            transforms.ToTensor(),
            transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5])
        ])

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path, chart_path = self.samples[idx]

        # Load image
        image = Image.open(img_path).convert('RGB')
        image = self.transform(image)

        # Load chart
        with open(chart_path) as f:
            chart = json.load(f)

        # Convert to tokens
        chart_tokens = self._chart_to_tokens(chart)

        return {
            'image': image,
            'chart': chart_tokens,
            'chart_raw': chart
        }

    def _chart_to_tokens(self, chart: Dict) -> Dict[str, torch.Tensor]:
        """Convert HD chart JSON to tensor tokens."""
        # Type token
        type_token = self.TYPE_MAP.get(chart['type'], 0)

        # Authority token
        auth_token = self.AUTHORITY_MAP.get(chart['authority'], 0)

        # Profile token (encode as single int: p1 * 12 + p2)
        profile = chart.get('profile', [1, 3])
        profile_token = (profile[0] - 1) * 12 + (profile[1] - 1)

        # Gate tokens (number * 6 + line - 1)
        gates = chart.get('conscious_gates', [])
        gate_tokens = []
        for g in gates[:self.max_gates]:
            gate_tokens.append(g['number'] * 6 + g['line'] - 1)
        # Pad
        while len(gate_tokens) < self.max_gates:
            gate_tokens.append(0)

        # Center tokens (binary: 1=defined, 0=open)
        center_tokens = [0] * 9
        for c in chart.get('defined_centers', []):
            if c in self.CENTER_MAP:
                center_tokens[self.CENTER_MAP[c]] = 1

        return {
            'type': torch.tensor(type_token, dtype=torch.long),
            'authority': torch.tensor(auth_token, dtype=torch.long),
            'profile': torch.tensor(profile_token, dtype=torch.long),
            'gates': torch.tensor(gate_tokens, dtype=torch.long),
            'centers': torch.tensor(center_tokens, dtype=torch.long)
        }


# ═══════════════════════════════════════════════════════════════════════════════
# TRAINING LOOP
# ═══════════════════════════════════════════════════════════════════════════════

class Trainer:
    def __init__(self, config: HDCyberVQVAEConfig, device: str = 'cuda'):
        self.config = config
        self.device = device
        self.model = HDCyberMorphVQVAEATO(config).to(device)
        self.trainer = MultiDatasetTrainer(self.model, config)

        self.checkpoint_dir = Path('checkpoints')
        self.checkpoint_dir.mkdir(exist_ok=True)

    def train_phase1_vqvae(self, dataset: CyberpunkFaceDataset, epochs: int = 50, 
                           batch_size: int = 8, lr: float = 1e-4):
        """Phase 1: Train VQ-VAE encoder/decoder/quantizer."""
        print("=" * 60)
        print("PHASE 1: VQ-VAE Pretraining")
        print("=" * 60)

        dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True, num_workers=4)

        optimizer = torch.optim.Adam([
            {'params': self.model.encoder.parameters(), 'lr': lr},
            {'params': self.model.decoder.parameters(), 'lr': lr},
            {'params': self.model.quantizer.parameters(), 'lr': lr * 0.5}
        ])

        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, epochs)

        for epoch in range(epochs):
            self.model.train()
            total_loss = 0
            total_recon = 0
            total_vq = 0

            pbar = tqdm(dataloader, desc=f"Epoch {epoch+1}/{epochs}")
            for batch in pbar:
                images = batch['image'].to(self.device)

                # VQ-VAE forward
                z = self.model.encoder(images)
                quantized, vq_loss, indices = self.model.quantizer(z)
                recon = self.model.decoder(quantized)

                recon_loss = nn.functional.mse_loss(recon, images)
                loss = recon_loss + vq_loss

                optimizer.zero_grad()
                loss.backward()
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
                optimizer.step()

                total_loss += loss.item()
                total_recon += recon_loss.item()
                total_vq += vq_loss.item()

                pbar.set_postfix({
                    'loss': f"{loss.item():.4f}",
                    'recon': f"{recon_loss.item():.4f}",
                    'vq': f"{vq_loss.item():.4f}"
                })

            scheduler.step()

            avg_loss = total_loss / len(dataloader)
            avg_recon = total_recon / len(dataloader)
            avg_vq = total_vq / len(dataloader)

            print(f"Epoch {epoch+1}: Loss={avg_loss:.4f}, Recon={avg_recon:.4f}, VQ={avg_vq:.4f}")

            # Save checkpoint
            if (epoch + 1) % 10 == 0:
                self.save_checkpoint(f'phase1_epoch{epoch+1}.pt')

        print("Phase 1 complete. VQ-VAE trained.")

    def train_phase2_transformer(self, dataset: CyberpunkFaceDataset, epochs: int = 100,
                                  batch_size: int = 16, lr: float = 3e-4):
        """Phase 2: Freeze VQ-VAE, train transformer on discrete codes."""
        print("=" * 60)
        print("PHASE 2: Transformer Training")
        print("=" * 60)

        dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True, num_workers=4)

        # Freeze VQ-VAE
        for param in self.model.encoder.parameters():
            param.requires_grad = False
        for param in self.model.decoder.parameters():
            param.requires_grad = False
        for param in self.model.quantizer.parameters():
            param.requires_grad = False

        optimizer = torch.optim.Adam([
            {'params': self.model.hd_embedder.parameters(), 'lr': lr},
            {'params': self.model.completion_engine.parameters(), 'lr': lr}
        ], betas=(0.9, 0.99))

        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, epochs)

        for epoch in range(epochs):
            self.model.train()
            total_loss = 0

            pbar = tqdm(dataloader, desc=f"Epoch {epoch+1}/{epochs}")
            for batch in pbar:
                images = batch['image'].to(self.device)
                charts = batch['chart']

                # Move chart tokens to device
                chart_tokens = {k: v.to(self.device) for k, v in charts.items()}

                # Encode to discrete (no grad)
                with torch.no_grad():
                    indices = self.model.encode(images)

                # Mask random positions for completion training
                B, H, W = indices.shape
                mask_ratio = 0.15 + 0.1 * (epoch / epochs)  # Increase masking over time
                mask = torch.rand(B, H, W, device=self.device) > mask_ratio

                # HD conditioning
                hd_cond = self.model.hd_embedder(chart_tokens)

                # Completion loss
                loss = self.model.completion_engine(indices, mask, hd_cond, style_id=0)

                optimizer.zero_grad()
                loss.backward()
                torch.nn.utils.clip_grad_norm_(
                    list(self.model.hd_embedder.parameters()) + 
                    list(self.model.completion_engine.parameters()), 1.0
                )
                optimizer.step()

                total_loss += loss.item()
                pbar.set_postfix({'loss': f"{loss.item():.4f}"})

            scheduler.step()
            avg_loss = total_loss / len(dataloader)
            print(f"Epoch {epoch+1}: Loss={avg_loss:.4f}")

            if (epoch + 1) % 20 == 0:
                self.save_checkpoint(f'phase2_epoch{epoch+1}.pt')

        print("Phase 2 complete. Transformer trained.")

    def train_phase3_joint(self, dataset: CyberpunkFaceDataset, epochs: int = 30,
                           batch_size: int = 8, lr: float = 1e-4):
        """Phase 3: Joint fine-tuning with semantic completion."""
        print("=" * 60)
        print("PHASE 3: Joint Fine-tuning")
        print("=" * 60)

        dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True, num_workers=4)

        # Unfreeze everything
        for param in self.model.parameters():
            param.requires_grad = True

        optimizer = torch.optim.Adam(self.model.parameters(), lr=lr, betas=(0.9, 0.99))
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, epochs)

        for epoch in range(epochs):
            self.model.train()
            total_loss = 0
            total_recon = 0
            total_vq = 0
            total_comp = 0

            pbar = tqdm(dataloader, desc=f"Epoch {epoch+1}/{epochs}")
            for batch in pbar:
                images = batch['image'].to(self.device)
                charts = batch['chart']
                chart_tokens = {k: v.to(self.device) for k, v in charts.items()}

                output = self.model(images, chart_tokens, style_id=0, mask_ratio=0.15)

                optimizer.zero_grad()
                output['total_loss'].backward()
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
                optimizer.step()

                total_loss += output['total_loss'].item()
                total_recon += output['recon_loss'].item()
                total_vq += output['vq_loss'].item()
                total_comp += output['comp_loss'].item()

                pbar.set_postfix({
                    'loss': f"{output['total_loss'].item():.4f}",
                    'recon': f"{output['recon_loss'].item():.4f}",
                    'comp': f"{output['comp_loss'].item():.4f}"
                })

            scheduler.step()

            n = len(dataloader)
            print(f"Epoch {epoch+1}: Loss={total_loss/n:.4f}, "
                  f"Recon={total_recon/n:.4f}, VQ={total_vq/n:.4f}, Comp={total_comp/n:.4f}")

            if (epoch + 1) % 10 == 0:
                self.save_checkpoint(f'phase3_epoch{epoch+1}.pt')

        print("Phase 3 complete. Model fine-tuned.")

    def add_dataset(self, dataset: CyberpunkFaceDataset, name: str):
        """Add a new dataset and apply network morphism if needed."""
        print(f"Adding dataset: {name}")

        # Register with trainer
        dataloader = DataLoader(dataset, batch_size=8, shuffle=True, num_workers=4)

        def chart_fn(charts):
            return {k: v.to(self.device) for k, v in charts.items()}

        self.trainer.register_dataset(name, dataloader, chart_fn)

        # Train on new dataset
        print(f"Training on {name}...")
        for epoch in range(20):
            loss = self.trainer.train_step(name)
            if epoch % 5 == 0:
                print(f"  Epoch {epoch}: Loss={loss.item():.4f}")

        self.save_checkpoint(f'dataset_{name}.pt')

    def save_checkpoint(self, filename: str):
        """Save model checkpoint."""
        path = self.checkpoint_dir / filename
        torch.save({
            'model': self.model.state_dict(),
            'config': self.config,
            'style_id': self.trainer.style_id
        }, path)
        print(f"Checkpoint saved: {path}")

    def load_checkpoint(self, filename: str):
        """Load model checkpoint."""
        path = self.checkpoint_dir / filename
        checkpoint = torch.load(path, map_location=self.device)
        self.model.load_state_dict(checkpoint['model'])
        self.trainer.style_id = checkpoint.get('style_id', 0)
        print(f"Checkpoint loaded: {path}")

    def generate_samples(self, chart: Dict, num_samples: int = 4, 
                         output_dir: str = 'generated'):
        """Generate samples from an HD chart."""
        out_dir = Path(output_dir)
        out_dir.mkdir(exist_ok=True)

        self.model.eval()

        # Convert chart to tokens
        dataset = CyberpunkFaceDataset('dummy')  # Just for tokenization
        chart_tokens = dataset._chart_to_tokens(chart)
        chart_tokens = {k: v.unsqueeze(0).to(self.device) for k, v in chart_tokens.items()}

        with torch.no_grad():
            for i in range(num_samples):
                generated = self.model.generate(chart_tokens, style_id=0, temperature=0.8)

                # Denormalize and save
                img = generated[0].cpu().permute(1, 2, 0).numpy()
                img = (img * 0.5 + 0.5).clip(0, 1)
                img = (img * 255).astype('uint8')

                from PIL import Image
                Image.fromarray(img).save(out_dir / f'sample_{i}.png')

        print(f"Generated {num_samples} samples in {output_dir}/")

    def morph_face(self, image_path: str, chart: Dict, output_path: str = 'morphed.png',
                   strength: float = 0.7):
        """Morph a face image using HD chart."""
        from PIL import Image

        # Load and preprocess image
        img = Image.open(image_path).convert('RGB')
        transform = transforms.Compose([
            transforms.Resize(self.config.image_size),
            transforms.CenterCrop(self.config.image_size),
            transforms.ToTensor(),
            transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5])
        ])
        image = transform(img).unsqueeze(0).to(self.device)

        # Convert chart
        dataset = CyberpunkFaceDataset('dummy')
        chart_tokens = dataset._chart_to_tokens(chart)
        chart_tokens = {k: v.unsqueeze(0).to(self.device) for k, v in chart_tokens.items()}

        # Morph
        self.model.eval()
        with torch.no_grad():
            morphed = self.model.morph_face(image, chart_tokens, style_id=0, 
                                            morph_strength=strength)

        # Save
        img = morphed[0].cpu().permute(1, 2, 0).numpy()
        img = (img * 0.5 + 0.5).clip(0, 1)
        img = (img * 255).astype('uint8')
        Image.fromarray(img).save(output_path)
        print(f"Morphed image saved: {output_path}")


# ═══════════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description='HDCyberMorph-VQVAE-ATO Training')
    parser.add_argument('--data', type=str, required=True, help='Path to dataset directory')
    parser.add_argument('--phase', type=int, default=1, choices=[1, 2, 3], 
                        help='Training phase')
    parser.add_argument('--epochs', type=int, default=50, help='Number of epochs')
    parser.add_argument('--batch-size', type=int, default=8, help='Batch size')
    parser.add_argument('--lr', type=float, default=1e-4, help='Learning rate')
    parser.add_argument('--device', type=str, default='cuda', help='Device')
    parser.add_argument('--tiny', action='store_true', help='Use tiny config for mobile')
    parser.add_argument('--resume', type=str, default=None, help='Resume from checkpoint')
    parser.add_argument('--generate', type=str, default=None, help='Generate from chart JSON')
    parser.add_argument('--morph', type=str, default=None, help='Morph image using chart JSON')

    args = parser.parse_args()

    # Config
    if args.tiny:
        config = MobileOptimizer.create_tiny_config()
        print("Using TINY config for mobile deployment")
    else:
        config = HDCyberVQVAEConfig()

    # Trainer
    trainer = Trainer(config, device=args.device)

    if args.resume:
        trainer.load_checkpoint(args.resume)

    # Dataset
    dataset = CyberpunkFaceDataset(args.data, image_size=config.image_size)
    print(f"Loaded dataset: {len(dataset)} samples")

    # Training
    if args.phase == 1:
        trainer.train_phase1_vqvae(dataset, args.epochs, args.batch_size, args.lr)
    elif args.phase == 2:
        trainer.train_phase2_transformer(dataset, args.epochs, args.batch_size, args.lr)
    elif args.phase == 3:
        trainer.train_phase3_joint(dataset, args.epochs, args.batch_size, args.lr)

    # Generation
    if args.generate:
        with open(args.generate) as f:
            chart = json.load(f)
        trainer.generate_samples(chart, num_samples=4)

    if args.morph:
        image_path, chart_path = args.morph.split(',')
        with open(chart_path) as f:
            chart = json.load(f)
        trainer.morph_face(image_path, chart)

    # Export
    if args.tiny:
        MobileOptimizer.export_onnx(trainer.model, 'hd_cyber_morph_tiny.onnx')
        print(f"Model size: {MobileOptimizer.get_model_size(trainer.model):.2f} MB")


if __name__ == '__main__':
    main()
