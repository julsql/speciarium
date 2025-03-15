from django.http import HttpRequest, HttpResponse
from django.shortcuts import render

from main.core.backend.logger.logger import logger


def error_404_view(request: HttpRequest, exception: Exception) -> HttpResponse:
    logger.error(f"404 Error: {exception}")
    return render(request, 'errors/404.html', status=404)

def error_500_view(request: HttpRequest) -> HttpResponse:
    logger.error("500 Error")
    return render(request, 'errors/500.html', status=500)
