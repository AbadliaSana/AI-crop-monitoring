from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ml_module.eval import evaluate_model


class MetricsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            samples = int(request.query_params.get("samples", 300))
        except ValueError:
            return Response({"detail": "samples must be int"}, status=status.HTTP_400_BAD_REQUEST)
        samples = max(50, min(samples, 2000))
        result = evaluate_model(samples=samples)
        return Response({"metrics": result.to_dict(), "samples": samples})
