"""Local-first paint-by-number evaluation pipelines (notebook + scripts)."""

from pbn_eval.pipeline import PipelineVariant, run_pipeline
from pbn_eval.metrics import compute_metrics
from pbn_eval.scoring import composite_auto_score, load_scoring_config

__all__ = [
    "PipelineVariant",
    "run_pipeline",
    "compute_metrics",
    "composite_auto_score",
    "load_scoring_config",
]
