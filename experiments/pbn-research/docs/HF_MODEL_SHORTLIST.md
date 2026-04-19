# Local Hugging Face model shortlist (next integration step)

Use these **after** the classical baseline stabilizes. All are optional; keep `max_api_calls: 0` and run weights locally.

| Role                  | HF search / families                   | Notes                                           |
| --------------------- | -------------------------------------- | ----------------------------------------------- |
| Salient object        | `u2net`, `basnet`, `isnet-general-use` | Strong masks for “do not merge subject”         |
| Semantic segmentation | `segformer`, `mask2former-swin`        | Background merge targets (sky, grass)           |
| Depth prior           | `depth-anything`, `DPT`, `MiDaS`       | Weak layering cue; validate on illustrations    |
| Interactive mask      | `SAM`                                  | Export masks into manifests for protected zones |

Record per model: revision hash, license, input resolution, seconds/image on your machine, failure modes on busy photos.
