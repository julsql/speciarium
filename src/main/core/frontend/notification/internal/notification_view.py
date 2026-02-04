from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, JsonResponse
from django.shortcuts import redirect
from django.urls import reverse
from django.views.decorators.http import require_POST
from django.db.models import Exists, OuterRef

from main.core.frontend.profile.profile import ProfileView
from main.models.upload_action import UploadAction
from main.models.upload_seen import UploadSeen


class NotificationView:
    def handle_request(self, request: HttpRequest) -> dict:
        if not request.user.is_authenticated:
            return {
                "notifications": UploadAction.objects.none()
            }

        notifications = (
            UploadAction.objects
            .filter(collection__collectionaccounts__user=request.user)
            .exclude(user=request.user)
            .annotate(
                seen=Exists(
                    UploadSeen.objects.filter(
                        upload=OuterRef("pk"),
                        user=request.user
                    )
                )
            )
            .select_related("user", "collection")
            .order_by("-created_at")
        )

        return {
            'notifications': notifications,
        }

    def notification_seen(self, request: HttpRequest, notification_id: int) -> JsonResponse:
        try:
            upload = UploadAction.objects.get(upload_id=notification_id)
        except UploadAction.DoesNotExist:
            return JsonResponse({"error": "Upload not found"}, status=404)

        UploadSeen.objects.get_or_create(upload=upload, user=request.user)

        return JsonResponse({"success": True})


def notifications_context(request):
    view = NotificationView()
    return view.handle_request(request)


@require_POST
@login_required
def notification_seen(request, notification_id):
    view = NotificationView()
    return view.notification_seen(request, notification_id)


@login_required
def notification_change_collection_view(request, collection_id, notification_id):
    view = ProfileView()
    view.change_collection(request, collection_id)
    url = reverse('photos')
    url += f'?upload_action_id={notification_id}'
    return redirect(url)
