package com.lessonreport.saas.auth

import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.Date
import java.util.UUID
import javax.crypto.SecretKey

@Service
class JwtService(
    private val appAuthProperties: AppAuthProperties
) {
    private val signingKey: SecretKey by lazy {
        Keys.hmacShaKeyFor(appAuthProperties.secret.toByteArray(Charsets.UTF_8))
    }

    fun issueToken(principal: AuthPrincipal): String {
        val now = Instant.now()
        val expiry = now.plusSeconds(appAuthProperties.tokenTtlMinutes * 60)

        return Jwts.builder()
            .subject(principal.username)
            .claim("instructorId", principal.instructorId.toString())
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiry))
            .signWith(signingKey)
            .compact()
    }

    fun parse(token: String): AuthPrincipal? {
        return try {
            val claims = Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .payload

            claims.toPrincipal()
        } catch (_: Exception) {
            null
        }
    }

    fun expiresInSeconds(): Long = appAuthProperties.tokenTtlMinutes * 60

    private fun Claims.toPrincipal(): AuthPrincipal {
        val username = subject
        val instructorId = UUID.fromString(get("instructorId", String::class.java))
        return AuthPrincipal(username, instructorId)
    }
}
