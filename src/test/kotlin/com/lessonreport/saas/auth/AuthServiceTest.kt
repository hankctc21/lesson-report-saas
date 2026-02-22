package com.lessonreport.saas.auth

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class AuthServiceTest {

    @Test
    fun `authenticate returns principal when credential matches`() {
        val props = AppAuthProperties(
            username = "admin",
            password = "pass1234"
        )
        val service = AuthService(props)

        val result = service.authenticate("admin", "pass1234")

        assertNotNull(result)
        assertEquals("admin", result!!.username)
        assertEquals(props.instructorId, result.instructorId)
    }

    @Test
    fun `authenticate returns null when credential mismatch`() {
        val service = AuthService(
            AppAuthProperties(
                username = "admin",
                password = "pass1234"
            )
        )

        assertNull(service.authenticate("admin", "wrong"))
        assertNull(service.authenticate("wrong", "pass1234"))
    }
}
