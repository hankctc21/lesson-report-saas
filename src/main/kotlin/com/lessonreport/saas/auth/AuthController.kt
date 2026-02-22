package com.lessonreport.saas.auth

import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api/v1/auth")
class AuthController(
    private val authService: AuthService,
    private val jwtService: JwtService
) {

    @PostMapping("/login")
    @ResponseStatus(HttpStatus.OK)
    fun login(@Valid @RequestBody request: LoginRequest): LoginResponse {
        val principal = authService.authenticate(request.username.trim(), request.password)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials")

        val token = jwtService.issueToken(principal)
        return LoginResponse(
            accessToken = token,
            tokenType = "Bearer",
            expiresIn = jwtService.expiresInSeconds()
        )
    }
}

data class LoginRequest(
    @field:NotBlank val username: String,
    @field:NotBlank val password: String
)

data class LoginResponse(
    val accessToken: String,
    val tokenType: String,
    val expiresIn: Long
)
