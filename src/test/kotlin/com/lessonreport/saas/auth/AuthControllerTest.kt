package com.lessonreport.saas.auth

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.KotlinModule
import com.fasterxml.jackson.module.kotlin.readValue
import com.lessonreport.saas.domain.AuthUser
import com.lessonreport.saas.domain.Instructor
import com.lessonreport.saas.repository.AuthUserRepository
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.mockito.Mockito.`when`
import org.mockito.Mockito.mock
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import java.util.UUID

class AuthControllerTest {

    private val objectMapper = ObjectMapper().registerModule(KotlinModule.Builder().build())

    @Test
    fun `login returns jwt token for valid credentials`() {
        val props = AppAuthProperties(
            secret = "this-is-a-demo-secret-key-with-sufficient-length-123456"
        )
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
        val authService = AuthService(repo)
        val jwtService = JwtService(props)
        val controller = AuthController(authService, jwtService)
        val mvc = MockMvcBuilders.standaloneSetup(controller).build()

        val body = objectMapper.writeValueAsString(LoginRequest("admin", "pass1234"))

        val response = mvc.perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
        )
            .andExpect(status().isOk)
            .andReturn()
            .response

        val payload: LoginResponse = objectMapper.readValue(response.contentAsString)
        assertNotNull(payload.accessToken)
        assertTrue(payload.accessToken.isNotBlank())
    }

    @Test
    fun `login returns unauthorized for invalid credentials`() {
        val props = AppAuthProperties(
            secret = "this-is-a-demo-secret-key-with-sufficient-length-123456"
        )
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
        val authService = AuthService(repo)
        val jwtService = JwtService(props)
        val controller = AuthController(authService, jwtService)
        val mvc = MockMvcBuilders.standaloneSetup(controller).build()

        val body = objectMapper.writeValueAsString(LoginRequest("admin", "wrong"))

        mvc.perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
        )
            .andExpect(status().isUnauthorized)
    }
}
