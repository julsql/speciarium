import django_tables2 as tables
from main.models.species import Species

italic = {"style": "font-style: italic;"}

def create_thumbnail_column():
    template = '''
        <img src="{{ record.thumbnail }}"
            class="thumbnail"
            data-full="{{ record.photo }}"
            data-title="<h2>{% if record.specie__french_name %}{{ record.specie__french_name }} - {% endif %}<i>{{ record.specie__latin_name }}</i></h2>"
            data-info="
            <p>Photo prise le {{ record.date }}
            en {{ record.country }}{% if record.region %}({{ record.region }}){% endif %}{% if record.details %}. {{ record.details }}{% endif %}
            </p>"
            alt="{{ record.specie__latin_name }}"
        >
    '''

    return tables.TemplateColumn(
        orderable=False,
        template_code=template,
        verbose_name="Photo"
    )

class MapTable(tables.Table):
    specie__latin_name = tables.Column(verbose_name="Nom latin", attrs={"td": italic})
    specie__french_name = tables.Column(verbose_name="Nom vernaculaire")
    specie__class_field = tables.Column(verbose_name="Classe", attrs={"td": italic})
    specie__order_field = tables.Column(verbose_name="Ordre", attrs={"td": italic})
    specie__family = tables.Column(verbose_name="Famille", attrs={"td": italic})
    year = tables.Column(verbose_name="Année")
    continent = tables.Column(verbose_name="Continent")
    country = tables.Column(verbose_name="Pays")
    region = tables.Column(verbose_name="Région")
    latitude = tables.Column(verbose_name="Latitude")
    longitude = tables.Column(verbose_name="Longitude")
    thumbnail = create_thumbnail_column()

    class Meta:
        model = Species
        template_name = "advanced_search_result/table.html"
        fields = ("specie__latin_name", "specie__french_name", "specie__class_field",
                  "specie__order_field", "specie__family", "year",
                  "continent", "country", "region",
                  "latitude", "longitude", 'thumbnail')
