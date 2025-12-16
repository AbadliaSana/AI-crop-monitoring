import json
from django.core.management.base import BaseCommand

from ml_module.eval import evaluate_model, save_report


class Command(BaseCommand):
    help = "Evaluate anomaly detection on synthetic data and report precision/recall/F1."

    def add_arguments(self, parser):
        parser.add_argument("--samples", type=int, default=500, help="Number of synthetic samples")
        parser.add_argument("--anomaly-ratio", type=float, default=0.2, help="Probability of anomaly per sample")
        parser.add_argument("--seed", type=int, default=42, help="Random seed")
        parser.add_argument("--output", type=str, default=None, help="Optional path to write JSON report")

    def handle(self, *args, **options):
        samples = options["samples"]
        anomaly_ratio = options["anomaly_ratio"]
        seed = options["seed"]
        output = options["output"]

        result = evaluate_model(samples=samples, anomaly_ratio=anomaly_ratio, seed=seed)
        params = {"samples": samples, "anomaly_ratio": anomaly_ratio, "seed": seed}

        self.stdout.write(self.style.SUCCESS(f"metrics: {json.dumps(result.to_dict())}"))
        if output:
            save_report(output, result, params)
            self.stdout.write(self.style.SUCCESS(f"report saved to {output}"))
