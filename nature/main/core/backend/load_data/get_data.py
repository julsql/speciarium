

from channels.layers import get_channel_layer


async def send_progress(progress):
    channel_layer = get_channel_layer()
    await channel_layer.group_send(
        "progress_group",
        {
            "type": "progress_update",
            "message": progress
        }
    )
