"""Pages publiques indexables : métadonnées SEO et contenu du sitemap."""
from dataclasses import dataclass


@dataclass(frozen=True)
class PublicPage:
    url_name: str
    title: str
    description: str
    changefreq: str = "monthly"
    priority: str = "0.5"


PUBLIC_PAGES = (
    PublicPage(
        url_name="home",
        title="Speciarium – Votre encyclopédie personnelle des espèces",
        description=(
            "Speciarium catalogue vos photos d'espèces : taxonomie iNaturalist et GBIF, "
            "carte des lieux d'observation, recherche avancée et collections partagées."
        ),
        priority="1.0",
    ),
    PublicPage(
        url_name="login",
        title="Connexion – Speciarium, votre encyclopédie des espèces",
        description=(
            "Connectez-vous à Speciarium pour retrouver votre collection de photos d'espèces, "
            "la carte de vos observations et la recherche dans votre catalogue."
        ),
    ),
    PublicPage(
        url_name="signup",
        title="Créer un compte – Speciarium, encyclopédie des espèces",
        description=(
            "Créez votre compte Speciarium et bâtissez votre encyclopédie des espèces "
            "rencontrées : photos, taxonomie, carte des observations et collections."
        ),
    ),
)

PUBLIC_PAGES_BY_NAME = {page.url_name: page for page in PUBLIC_PAGES}
