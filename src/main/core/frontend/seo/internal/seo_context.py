import json

from django.conf import settings
from django.templatetags.static import static
from django.urls import reverse
from django.utils.safestring import mark_safe

from main.core.frontend.seo.internal.pages import PUBLIC_PAGES_BY_NAME


def _json_ld(site_url: str, page) -> str:
    data = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebSite",
                "@id": f"{site_url}/#website",
                "name": "Speciarium",
                "url": f"{site_url}/",
                "inLanguage": "fr",
                "description": page.description,
            },
            {
                "@type": "WebApplication",
                "name": "Speciarium",
                "url": f"{site_url}/",
                "applicationCategory": "EducationalApplication",
                "operatingSystem": "Web",
                "inLanguage": "fr",
                "description": page.description,
                "image": f"{site_url}{static('main/images/og-image.jpg')}",
                "author": {"@type": "Person", "name": "JulSql"},
                "isPartOf": {"@id": f"{site_url}/#website"},
            },
        ],
    }
    # "<" échappé pour qu'aucune valeur ne puisse fermer la balise <script>.
    return mark_safe(json.dumps(data, ensure_ascii=False).replace("<", "\\u003c"))


def seo_context(request):
    """Expose les métadonnées SEO des pages publiques aux visiteurs anonymes."""
    site_url = settings.SITE_URL
    context = {"site_url": site_url}
    match = getattr(request, "resolver_match", None)
    user = getattr(request, "user", None)
    if match is None or (user is not None and user.is_authenticated):
        return context

    page = PUBLIC_PAGES_BY_NAME.get(match.url_name)
    if page is None:
        return context

    context["seo_page"] = page
    context["seo_canonical"] = f"{site_url}{reverse(page.url_name)}"
    context["seo_image"] = f"{site_url}{static('main/images/og-image.jpg')}"
    if page.url_name == "home":
        context["seo_json_ld"] = _json_ld(site_url, page)
    return context
