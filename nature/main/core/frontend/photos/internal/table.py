import django_tables2 as tables

from main.models.photo import Photos


def create_thumbnail_column():
    template = '''
        <img src="{{ record.thumbnail }}"
            class="thumbnail"
            data-full="{{ record.photo }}"
            alt="{{ record.specie__latin_name }}"
        >
    '''

    return tables.TemplateColumn(
        orderable=False,
        template_code=template,
        verbose_name="Photo"
    )


italic = "font-style: italic;"
width = "max-width: 130px;"


class PhotosTable(tables.Table):
    specie__latin_name = tables.Column(verbose_name="Nom latin", attrs={"td": {"style": italic + width}})
    specie__french_name = tables.Column(verbose_name="Nom vernaculaire", attrs={"td": {"style": width}})
    specie__kingdom = tables.Column(verbose_name="Règne", attrs={"td": {"style": italic}})
    specie__class_field = tables.Column(verbose_name="Classe", attrs={"td": {"style": italic}})
    specie__order_field = tables.Column(verbose_name="Ordre", attrs={"td": {"style": italic}})
    specie__family = tables.Column(verbose_name="Famille", attrs={"td": {"style": italic}})
    date = tables.Column(verbose_name="Date")
    continent = tables.Column(verbose_name="Continent")
    country = tables.Column(verbose_name="Pays")
    region = tables.Column(verbose_name="Région")
    coordinates = tables.Column(verbose_name="Coordonnées")
    thumbnail = create_thumbnail_column()

    all_images = tables.TemplateColumn(
        template_code="""
                <span class="all-images" data-images='[
                        {
                            "full": "{{ record.photo }}",
                            "thumbnail": "{{ record.thumbnail }}",
                            "title": "{% if record.specie__french_name %}{{ record.specie__french_name }} - {% endif %}<i>{{ record.specie__latin_name }}</i>",
                            "latitude": {{ record.latitude }},
                            "longitude": {{ record.longitude }},
                            "info": "Photo {{ record.number_picture }} prise {% if record.date %}le {{ record.date }} {% endif %}en {{ record.country }} {% if record.region %} ({{ record.region }}){% endif %}{% if record.details %}. {{ record.details }}{% endif %}"
                        }
                ]' hidden></span>
                """,
        verbose_name="",
        orderable=False
    )

    class Meta:
        model = Photos
        template_name = "table/module.html"
        fields = ("specie__latin_name", "specie__french_name", "specie__kingdom",
                  "specie__class_field", "specie__order_field", "specie__family",
                  "date", "continent", "country", "region",
                  "coordinates", 'thumbnail')
