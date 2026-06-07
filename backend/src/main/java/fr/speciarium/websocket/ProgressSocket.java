package fr.speciarium.websocket;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.websocket.OnClose;
import jakarta.websocket.OnOpen;
import jakarta.websocket.Session;
import jakarta.websocket.server.ServerEndpoint;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@ServerEndpoint("/ws/progress")
@ApplicationScoped
public class ProgressSocket {

    private final Set<Session> sessions = ConcurrentHashMap.newKeySet();

    @OnOpen
    public void onOpen(Session s) { sessions.add(s); }

    @OnClose
    public void onClose(Session s) { sessions.remove(s); }

    public void broadcast(String message) {
        String payload = "{\"progress\":" + escape(message) + "}";
        for (Session s : sessions) {
            if (s.isOpen()) {
                try { s.getBasicRemote().sendText(payload); } catch (IOException ignored) {}
            }
        }
    }

    public void broadcastNumber(int n) {
        String payload = "{\"progress\":" + n + "}";
        for (Session s : sessions) {
            if (s.isOpen()) {
                try { s.getBasicRemote().sendText(payload); } catch (IOException ignored) {}
            }
        }
    }

    private String escape(String s) {
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
