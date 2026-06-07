package fr.speciarium.security;

import io.quarkus.redis.client.RedisClient;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@ApplicationScoped
public class SessionStore {

    private static final Logger LOG = Logger.getLogger(SessionStore.class);

    @Inject
    Instance<RedisClient> redisInstance;

    @ConfigProperty(name = "speciarium.session.ttl-seconds", defaultValue = "2592000")
    long ttlSeconds;

    /** false → utilise une map en mémoire (dev/test) ; true → Redis (prod). */
    @ConfigProperty(name = "speciarium.session.use-redis", defaultValue = "false")
    boolean useRedis;

    private final SecureRandom random = new SecureRandom();
    private final ConcurrentHashMap<String, Entry> memory = new ConcurrentHashMap<>();
    private RedisClient redis;

    @PostConstruct
    void init() {
        if (useRedis && !redisInstance.isUnsatisfied()) {
            try {
                redis = redisInstance.get();
                // ping pour valider la connexion ; sinon on bascule en mémoire
                redis.ping(List.of());
                LOG.info("SessionStore: Redis activé");
                return;
            } catch (Exception e) {
                LOG.warnf("Redis indisponible, bascule sur stockage mémoire: %s", e.getMessage());
            }
        }
        LOG.info("SessionStore: stockage en mémoire (dev)");
    }

    public String create(Long userId) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        if (redis != null) {
            redis.setex(key(token), String.valueOf(ttlSeconds), String.valueOf(userId));
        } else {
            memory.put(token, new Entry(userId, System.currentTimeMillis() + ttlSeconds * 1000L));
        }
        return token;
    }

    public Optional<Long> resolve(String token) {
        if (token == null || token.isBlank()) return Optional.empty();
        if (redis != null) {
            var v = redis.get(key(token));
            if (v == null) return Optional.empty();
            try {
                redis.expire(key(token), String.valueOf(ttlSeconds));
                return Optional.of(Long.parseLong(v.toString()));
            } catch (NumberFormatException e) {
                return Optional.empty();
            }
        }
        Entry entry = memory.get(token);
        if (entry == null) return Optional.empty();
        if (entry.expiresAt < System.currentTimeMillis()) {
            memory.remove(token);
            return Optional.empty();
        }
        memory.put(token, new Entry(entry.userId, System.currentTimeMillis() + ttlSeconds * 1000L));
        return Optional.of(entry.userId);
    }

    public void destroy(String token) {
        if (token == null || token.isBlank()) return;
        if (redis != null) {
            redis.del(List.of(key(token)));
        } else {
            memory.remove(token);
        }
    }

    private String key(String token) {
        return "speciarium:session:" + token;
    }

    private record Entry(Long userId, long expiresAt) {}
}
