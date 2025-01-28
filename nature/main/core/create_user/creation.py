from main.models import AppUser

def create_user(username, password, first_name, last_name, email):

    user = AppUser.objects.create_user(username=username, password=password)
    user.first_name = first_name
    user.last_name = last_name
    user.email = email
    user.save()

username = ""
password = ""
first_name = ""
last_name = ""
email = ""
create_user(username, password, first_name, last_name, email)