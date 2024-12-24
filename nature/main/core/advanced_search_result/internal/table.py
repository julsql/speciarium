import django_tables2 as tables
from main.models.species import Species

class SpeciesTable(tables.Table):
    latin_name = tables.Column(verbose_name="Nom latin")
    genus = tables.Column(verbose_name="Genre")
    species = tables.Column(verbose_name="Espèce")
    french_name = tables.Column(verbose_name="Nom vernaculaire")
    class_field = tables.Column(verbose_name="Classe")
    min_year = tables.Column(verbose_name="Année")
    day_list = tables.TemplateColumn(
        orderable=False,
        template_code="""
        {% for day in record.day_list %}
            {{ day }}<br>
        {% endfor %}
        """,
        verbose_name="Dates"
    )
    first_continent = tables.Column(visible=False)  # Colonne masquée utilisée pour le tri
    continent_list = tables.TemplateColumn(
        template_code="""
        {% for continent in record.continent_list %}
            {{ continent }}<br>
        {% endfor %}
        """,
        verbose_name="Continents",
    )
    thumbnail1 = tables.TemplateColumn(
        orderable=False,
        template_code='''
            <a href="{{ record.image1.photo }}" target="_blank">
                <img src="{{ record.image1.thumbnail }}" alt="Thumbnail" style="max-height: 100px; max-width: 150px;">
            </a>
            {% if record.image1.note %}
                <p>{{ record.image1.note }}</p>
            {% endif %}
        ''',
        verbose_name="Photo 1"
    )
    thumbnail2 = tables.TemplateColumn(
        orderable=False,
        template_code='''
        {% if record.image2 %}
            <a href="{{ record.image2.photo }}" target="_blank">
                <img src="{{ record.image2.thumbnail }}" alt="Thumbnail" style="max-height: 100px; max-width: 150px;">
            </a>
            {% if record.image2.note %}
                <p>{{ record.image2.note }}</p>
            {% endif %}
        {% endif %}
        ''',
        verbose_name="Photo 2"
    )
    thumbnail3 = tables.TemplateColumn(
        orderable=False,
        template_code='''
        {% if record.image3 %}
            <a href="{{ record.image3.photo }}" target="_blank">
                <img src="{{ record.image3.thumbnail }}" alt="Thumbnail" style="max-height: 100px; max-width: 150px;">
            </a>
            {% if record.image3.note %}
                <p>{{ record.image3.note }}</p>
            {% endif %}
        {% endif %}
        ''',
        verbose_name="Photo 3"
    )

    class Meta:
            model = Species
            template_name = "django_tables2/bootstrap.html"
            fields = ("latin_name", "genus", "species",
                      "french_name", "class_field", "min_year", "day_list",
                      "continent_list", "thumbnail1", "thumbnail2", "thumbnail3")
