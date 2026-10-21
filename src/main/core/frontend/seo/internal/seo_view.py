from django.conf import settings
from django.shortcuts import render
from django.urls import reverse
from django.views.decorators.cache import cache_control
from django.views.decorators.http import require_GET

from main.core.frontend.seo.internal.pages import PUBLIC_PAGES


@require_GET
@cache_control(public=True, max_age=86400)
def robots_txt(request):
    return render(request, "seo/robots.txt", content_type="text/plain; charset=utf-8")


@require_GET
@cache_control(public=True, max_age=86400)
def sitemap_xml(request):
    urls = [
        {
            "loc": f"{settings.SITE_URL}{reverse(page.url_name)}",
            "changefreq": page.changefreq,
            "priority": page.priority,
        }
        for page in PUBLIC_PAGES
    ]
    return render(
        request, "seo/sitemap.xml", {"urls": urls}, content_type="application/xml; charset=utf-8"
    )
