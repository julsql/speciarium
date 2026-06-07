package fr.speciarium.security;

import jakarta.enterprise.context.ApplicationScoped;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Implémente le format Django `pbkdf2_sha256$<iterations>$<salt>$<hash>` afin
 * que les comptes existants restent connectables et que les nouveaux comptes
 * soient lisibles par l'admin Django si jamais on bascule.
 */
@ApplicationScoped
public class DjangoPasswordHasher {

    private static final String ALGO = "pbkdf2_sha256";
    private static final int DEFAULT_ITERATIONS = 600_000;
    private static final int KEY_LENGTH_BITS = 256;

    private final SecureRandom random = new SecureRandom();

    public String hash(String password) {
        byte[] saltBytes = new byte[12];
        random.nextBytes(saltBytes);
        String salt = base64UrlNoPadding(saltBytes).substring(0, 12);
        String derived = derive(password, salt, DEFAULT_ITERATIONS);
        return ALGO + "$" + DEFAULT_ITERATIONS + "$" + salt + "$" + derived;
    }

    public boolean verify(String password, String encoded) {
        if (encoded == null || !encoded.startsWith(ALGO + "$")) return false;
        String[] parts = encoded.split("\\$");
        if (parts.length != 4) return false;
        int iterations;
        try {
            iterations = Integer.parseInt(parts[1]);
        } catch (NumberFormatException e) {
            return false;
        }
        String salt = parts[2];
        String expected = parts[3];
        String actual = derive(password, salt, iterations);
        return constantTimeEquals(expected, actual);
    }

    private String derive(String password, String salt, int iterations) {
        try {
            PBEKeySpec spec = new PBEKeySpec(
                password.toCharArray(),
                salt.getBytes(),
                iterations,
                KEY_LENGTH_BITS
            );
            SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            byte[] derived = factory.generateSecret(spec).getEncoded();
            return Base64.getEncoder().encodeToString(derived);
        } catch (Exception e) {
            throw new IllegalStateException("PBKDF2 derivation failed", e);
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) return false;
        int diff = 0;
        for (int i = 0; i < a.length(); i++) diff |= a.charAt(i) ^ b.charAt(i);
        return diff == 0;
    }

    private static String base64UrlNoPadding(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
