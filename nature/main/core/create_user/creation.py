from main.models import AppUser

def create_user():
    username = input('username: ')
    password = input('password: ')
    first_name = input('first_name: ')
    last_name = input('last_name: ')
    email = input('email: ')

    user = AppUser.objects.create_user(username=username, password=password)
    user.first_name = first_name
    user.last_name = last_name
    user.email = email
    user.save()
