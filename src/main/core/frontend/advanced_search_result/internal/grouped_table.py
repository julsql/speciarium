import django_tables2 as tables


class GroupedResultsTable(tables.Table):
    name = tables.Column(verbose_name="Valeur")
    count = tables.Column(verbose_name="Nombre de résultats")

    class Meta:
        template_name = "table/module.html"
        attrs = {"class": "table"}


def make_comparison_table(collection_columns):
    """
    Build a django-tables2 Table class with one column per collection.

    `collection_columns` is an ordered list of (column_key, verbose_name) tuples
    where `column_key` is the key used in each row dict (e.g. "collection_42").
    """
    attrs = {
        "name": tables.Column(verbose_name="Valeur"),
    }
    for column_key, verbose_name in collection_columns:
        attrs[column_key] = tables.Column(verbose_name=verbose_name, default=0)

    Meta = type("Meta", (), {
        "template_name": "table/module.html",
        "attrs": {"class": "table"},
        "sequence": ("name",) + tuple(key for key, _ in collection_columns),
        "row_attrs": {
            "class": lambda record: "total-row" if record.get("name") == "Total en commun" else "",
        },
    })
    attrs["Meta"] = Meta

    return type("ComparisonTable", (tables.Table,), attrs)
