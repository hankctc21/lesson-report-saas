package com.lessonreport.saas.auth

import com.lessonreport.saas.domain.AuthUser
import com.lessonreport.saas.domain.Instructor
import com.lessonreport.saas.repository.AuthUserRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.mockito.Mockito.`when`
import org.mockito.Mockito.mock
import java.util.UUID

class AuthServiceTest {

    @Test
    fun `authenticate returns principal when credential matches`() {
        val instructorId = UUID.fromString("11111111-1111-1111-1111-111111111111")
        val repo = mock(AuthUserRepository::class.java)
        `when`(repo.findByUsername("admin")).thenReturn(
            AuthUser(
                username = "admin",
                password = "pass1234",
                instructor = Instructor(id = instructorId, email = "owner@lessonreport.local", displayName = "Owner")
            )
        )
        val service = AuthService(repo)

        val result = service.authenticate("admin", "pass1234")

        assertNotNull(result)
        assertEquals("admin", result!!.username)
        assertEquals(instructorId, result.instructorId)
    }

    @Test
    fun `authenticate returns null when credential mismatch`() {
        val repo = mock(AuthUserRepository::class.java)
        `when`(repo.findByUsername("admin")).thenReturn(
            AuthUser(
                username = "admin",
                password = "pass1234",
                instructor = Instructor(
                    id = UUID.fromString("11111111-1111-1111-1111-111111111111"),
                    email = "owner@lessonreport.local",
                    displayName = "Owner"
                )
            )
        )
        val service = AuthService(repo)

        assertNull(service.authenticate("admin", "wrong"))
        assertNull(service.authenticate("wrong", "pass1234"))
    }
}
