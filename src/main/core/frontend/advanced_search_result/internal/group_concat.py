from django.db.models import Aggregate
from django.db.models import TextField

class GroupConcat(Aggregate):
    function = 'GROUP_CONCAT'
    template = '%(function)s(%(expressions)s, "%(delimiter)s")'
    delimiter = ','

    def __init__(self, expression, delimiter=',', **extra):
        super().__init__(expression, **extra)
        self.delimiter = delimiter

    def as_sql(self, compiler, connection):
        self.extra['delimiter'] = self.delimiter
        return super().as_sql(compiler, connection)

    output_field = TextField()
