package com.lessonreport.saas.api

import com.lessonreport.saas.domain.ClientProgressPhoto
import com.lessonreport.saas.domain.ProgressPhotoPhase
import com.lessonreport.saas.repository.ClientProgressPhotoRepository
import com.lessonreport.saas.repository.ClientRepository
import com.lessonreport.saas.repository.ReportShareRepository
import com.lessonreport.saas.service.InstructorContext
import org.springframework.beans.factory.annotation.Value
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.server.ResponseStatusException
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

@RestController
@RequestMapping("/api/v1")
class ClientProgressPhotoController(
    private val clientRepository: ClientRepository,
    private val clientProgressPhotoRepository: ClientProgressPhotoRepository,
    private val reportShareRepository: ReportShareRepository,
    private val instructorContext: InstructorContext,
    @Value("\${app.upload-dir:./uploads}")
    uploadDir: String
) {
    private val rootDir: Path = Paths.get(uploadDir).toAbsolutePath().normalize()

    @GetMapping("/clients/{clientId}/progress-photos")
    fun list(@PathVariable clientId: UUID): List<ClientProgressPhotoResponse> {
        val instructorId = instructorContext.currentInstructorId()
        val client = findOwnedClient(clientId, instructorId)
        return clientProgressPhotoRepository.findByClientIdAndInstructorIdOrderByCreatedAtDesc(client.id!!, instructorId)
            .map { it.toResponse() }
    }

    @PostMapping("/clients/{clientId}/progress-photos", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    @ResponseStatus(HttpStatus.CREATED)
    fun upload(
        @PathVariable clientId: UUID,
        @RequestPart("file") file: MultipartFile,
        @RequestParam(defaultValue = "ETC") phase: ProgressPhotoPhase,
        @RequestParam(required = false) note: String?,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) takenOn: LocalDate?
    ): ClientProgressPhotoResponse {
        if (file.isEmpty) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty")
        if (!(file.contentType ?: "").startsWith("image/")) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Only image files are allowed")
        }
        val instructor = instructorContext.currentInstructor()
        val client = findOwnedClient(clientId, instructor.id!!)

        Files.createDirectories(rootDir)
        val ext = inferExtension(file.contentType ?: "image/jpeg")
        val safeName = (file.originalFilename ?: "progress.$ext").take(240)

        val photo = clientProgressPhotoRepository.save(
            ClientProgressPhoto(
                instructor = instructor,
                client = client,
                phase = phase,
                note = note,
                takenOn = takenOn,
                fileName = safeName,
                contentType = file.contentType ?: "image/jpeg",
                storagePath = ""
            )
        )

        val path = rootDir.resolve("client-progress").resolve(clientId.toString()).resolve("${photo.id}.$ext").normalize()
        Files.createDirectories(path.parent)
        file.inputStream.use { input -> Files.copy(input, path) }

        photo.storagePath = path.toString()
        return clientProgressPhotoRepository.save(photo).toResponse()
    }

    @GetMapping("/clients/{clientId}/progress-photos/{photoId}")
    fun openForInstructor(@PathVariable clientId: UUID, @PathVariable photoId: UUID): ResponseEntity<ByteArray> {
        val instructorId = instructorContext.currentInstructorId()
        findOwnedClient(clientId, instructorId)
        val photo = clientProgressPhotoRepository.findByIdAndClientId(photoId, clientId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found")
        return openImage(photo)
    }

    @GetMapping("/share/{token}/client-photos/{photoId}")
    fun openForSharedView(@PathVariable token: String, @PathVariable photoId: UUID): ResponseEntity<ByteArray> {
        val share = reportShareRepository.findByToken(token)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Share not found")
        if (share.revoked || share.expiresAt!!.isBefore(Instant.now())) {
            throw ResponseStatusException(HttpStatus.GONE, "Share link expired")
        }
        val clientId = share.report!!.client!!.id!!
        val photo = clientProgressPhotoRepository.findByIdAndClientId(photoId, clientId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found")
        return openImage(photo)
    }

    private fun findOwnedClient(clientId: UUID, instructorId: UUID) =
        clientRepository.findByIdAndInstructorId(clientId, instructorId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Client not found")

    private fun openImage(photo: ClientProgressPhoto): ResponseEntity<ByteArray> {
        val filePath = Paths.get(photo.storagePath ?: "")
        if (!Files.exists(filePath)) throw ResponseStatusException(HttpStatus.NOT_FOUND, "Photo file not found")
        val bytes = Files.readAllBytes(filePath)
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"${photo.fileName}\"")
            .contentType(MediaType.parseMediaType(photo.contentType ?: "image/jpeg"))
            .body(bytes)
    }

    private fun inferExtension(contentType: String): String = when {
        contentType.contains("png") -> "png"
        contentType.contains("webp") -> "webp"
        contentType.contains("gif") -> "gif"
        else -> "jpg"
    }

    private fun ClientProgressPhoto.toResponse() = ClientProgressPhotoResponse(
        id = id!!,
        clientId = client!!.id!!,
        phase = phase.name,
        note = note,
        takenOn = takenOn,
        fileName = fileName!!,
        imageUrl = "/api/v1/clients/${client!!.id}/progress-photos/$id",
        createdAt = createdAt ?: Instant.now()
    )
}

data class ClientProgressPhotoResponse(
    val id: UUID,
    val clientId: UUID,
    val phase: String,
    val note: String?,
    val takenOn: LocalDate?,
    val fileName: String,
    val imageUrl: String,
    val createdAt: Instant
)
