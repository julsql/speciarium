import django_tables2 as tables


class GroupedResultsTable(tables.Table):
    name = tables.Column(verbose_name="Valeur")
    count = tables.Column(verbose_name="Nombre de résultats")

    class Meta:
        template_name = "table/module.html"
        attrs = {"class": "table"}
