from datetime import date, datetime

from django.test import SimpleTestCase

from main.templatetags.json_filters import format_french_date, get_info


class FormatFrenchDateTests(SimpleTestCase):
    def test_date_object(self):
        self.assertEqual(format_french_date(date(2023, 11, 17)), "17/11/2023")

    def test_datetime_object(self):
        self.assertEqual(format_french_date(datetime(2023, 11, 17, 8, 30)), "17/11/2023")

    def test_iso_string(self):
        self.assertEqual(format_french_date("2023-11-17"), "17/11/2023")

    def test_already_french_string(self):
        self.assertEqual(format_french_date("17/11/2023"), "17/11/2023")

    def test_empty_value(self):
        self.assertEqual(format_french_date(""), "")
        self.assertEqual(format_french_date(None), "")

    def test_unparsable_value_is_returned_as_is(self):
        self.assertEqual(format_french_date("hiver 2023"), "hiver 2023")


class GetInfoTests(SimpleTestCase):
    def test_info_uses_french_date_format(self):
        info = get_info({"date": date(2023, 11, 17), "country": "Grèce"})
        self.assertEqual(info, "Photo prise le 17/11/2023 en Grèce")

    def test_info_with_region_and_details(self):
        info = get_info({
            "date": "2023-11-17",
            "country": "Grèce",
            "region": "Crète",
            "details": "Sur un mur.",
        })
        self.assertEqual(info, "Photo prise le 17/11/2023 en Grèce (Crète). Sur un mur.")
