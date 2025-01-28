"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns: path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.contrib.auth import views as auth_views

from django.conf import settings
from django.conf.urls.static import static

from main.core.get_hash.internal.get_hash_view import get_hash
from main.core.home.internal.home_view import home
from main.core.errors.internal.errors_view import error_500_view, error_404_view
from main.core.login.internal.login_view import login_view
from main.core.upload_images.internal.upload_images import upload_images

handler500 = error_500_view
handler404 = error_404_view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/login/', login_view, name='login'),
    path('accounts/logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('accounts/', include('django.contrib.auth.urls')),
    path('', home, name='home'),
    path('upload-images/', upload_images, name='upload'),
    path('hash/', get_hash, name='hash'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
