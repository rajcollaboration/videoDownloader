from locust import HttpUser, between, task


class DownloaderUser(HttpUser):
    wait_time = between(1, 3)

    @task(4)
    def resolve_single_video(self):
        self.client.post(
            "/v1/videos/resolve",
            json={"url": "https://youtube.com/watch?v=loadtest"},
            name="resolve_video",
        )

    @task(2)
    def create_download(self):
        response = self.client.post(
            "/v1/videos/resolve",
            json={"url": "https://youtube.com/watch?v=loadtest"},
            name="resolve_before_download",
        )
        if response.status_code != 200:
            return

        request_id = response.json()["requestId"]
        self.client.post(
            "/v1/downloads",
            json={"request_id": request_id, "format_id": "18", "audio_only": False},
            name="create_download",
        )

    @task(1)
    def resolve_playlist(self):
        self.client.post(
            "/v1/videos/resolve",
            json={"url": "https://youtube.com/playlist?list=loadtest"},
            name="resolve_playlist",
        )

