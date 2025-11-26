import django_tables2 as tables

from main.models.species import Species


def create_thumbnail_column(image_number):
    template = f'''
        {{% if record.all_photos.{image_number} %}}
            <img src="{{{{ record.all_photos.{image_number}.thumbnail }}}}"
                class="thumbnail"
                data-full="{{{{ record.all_photos.{image_number}.photo }}}}"
                alt="{{{{ record.specie__latin_name }}}}"
            >
        {{% endif %}}
    '''
    return tables.TemplateColumn(
        orderable=False,
        template_code=template,
        verbose_name=f"Photo {image_number + 1}"
    )


italic = "font-style: italic;"
width = "max-width: 130px;"


class SpeciesTable(tables.Table):
    specie__latin_name = tables.Column(verbose_name="Nom latin", attrs={"td": {"style": italic + width}})
    specie__french_name = tables.Column(verbose_name="Nom vernaculaire", attrs={"td": {"style": width}})
    specie__kingdom = tables.Column(verbose_name="Règne", attrs={"td": {"style": italic}})
    specie__class_field = tables.Column(verbose_name="Classe", attrs={"td": {"style": italic}})
    specie__order_field = tables.Column(verbose_name="Ordre", attrs={"td": {"style": italic}})
    specie__family = tables.Column(verbose_name="Famille", attrs={"td": {"style": italic}})
    min_year = tables.Column(verbose_name="Année")
    first_continent = tables.Column(visible=False)
    continent_list = tables.TemplateColumn(
        template_code="""
        {% for continent in record.continent_list %}
            {{ continent }}<br>
        {% endfor %}
        """,
        verbose_name="Continents",
        order_by="first_continent"
    )
    first_country = tables.Column(visible=False)
    country_list = tables.TemplateColumn(
        template_code="""
        {% for country in record.country_list %}
            {{ country }}<br>
        {% endfor %}
        """,
        verbose_name="Pays",
        order_by="first_country"
    )
    first_region = tables.Column(visible=False)
    region_list = tables.TemplateColumn(
        template_code="""
        {% for region in record.region_list %}
            {{ region }}<br>
        {% endfor %}
        """,
        verbose_name="Régions",
        order_by="first_region"
    )

    number_picture = tables.Column(verbose_name="N")
    thumbnail1 = create_thumbnail_column(0)
    thumbnail2 = create_thumbnail_column(1)
    thumbnail3 = create_thumbnail_column(2)

    all_images = tables.TemplateColumn(
        template_code="""
            {% load json_filters %}
            <span class="all-images" data-images='{{ record|get_all_images_json }}' hidden></span>
        """,
        verbose_name="",
        orderable=False
    )

    class Meta:
        model = Species
        template_name = "table/module.html"
        fields = ("specie__latin_name", "specie__french_name", "specie__kingdom",
                  "specie__class_field", "specie__order_field", "specie__family",
                  "min_year", "continent_list", "country_list", "region_list",
                  "number_picture", "thumbnail1", "thumbnail2", "thumbnail3")
