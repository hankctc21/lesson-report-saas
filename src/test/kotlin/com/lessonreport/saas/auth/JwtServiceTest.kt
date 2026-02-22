package com.lessonreport.saas.auth

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import java.util.UUID

class JwtServiceTest {

    @Test
    fun `issue and parse token`() {
        val props = AppAuthProperties(
            secret = "this-is-a-demo-secret-key-with-sufficient-length-123456",
            tokenTtlMinutes = 10
        )
        val service = JwtService(props)
        val principal = AuthPrincipal("admin", UUID.fromString("11111111-1111-1111-1111-111111111111"))

        val token = service.issueToken(principal)
        val parsed = service.parse(token)

        assertNotNull(parsed)
        assertEquals(principal.username, parsed!!.username)
        assertEquals(principal.instructorId, parsed.instructorId)
    }

    @Test
    fun `parse returns null for invalid token`() {
        val props = AppAuthProperties(
            secret = "this-is-a-demo-secret-key-with-sufficient-length-123456"
        )
        val service = JwtService(props)

        assertNull(service.parse("invalid.token.value"))
    }
}
