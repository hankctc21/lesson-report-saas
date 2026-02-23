package com.lessonreport.saas.api

import com.lessonreport.saas.domain.ReportPhoto
import com.lessonreport.saas.repository.ReportPhotoRepository
import com.lessonreport.saas.repository.ReportRepository
import com.lessonreport.saas.repository.ReportShareRepository
import com.lessonreport.saas.service.InstructorContext
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.server.ResponseStatusException
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.time.Instant
import java.util.UUID

@RestController
@RequestMapping("/api/v1")
class ReportPhotoController(
    private val reportRepository: ReportRepository,
    private val reportShareRepository: ReportShareRepository,
    private val reportPhotoRepository: ReportPhotoRepository,
    private val instructorContext: InstructorContext,
    @Value("\${app.upload-dir:./uploads}")
    uploadDir: String
) {
    private val rootDir: Path = Paths.get(uploadDir).toAbsolutePath().normalize()

    @PostMapping("/reports/{reportId}/photos", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    @ResponseStatus(HttpStatus.CREATED)
    fun upload(
        @PathVariable reportId: UUID,
        @RequestPart("file") file: MultipartFile
    ): ReportPhotoResponse {
        if (file.isEmpty) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty")
        if (!(file.contentType ?: "").startsWith("image/")) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Only image files are allowed")
        }

        val instructorId = instructorContext.currentInstructorId()
        val report = reportRepository.findByIdAndInstructorId(reportId, instructorId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found")

        Files.createDirectories(rootDir)
        val ext = inferExtension(file.contentType ?: "image/jpeg")
        val safeName = (file.originalFilename ?: "photo.$ext").take(240)

        val photo = reportPhotoRepository.save(
            ReportPhoto(
                report = report,
                fileName = safeName,
                contentType = file.contentType ?: "image/jpeg",
                storagePath = ""
            )
        )

        val path = rootDir.resolve(reportId.toString()).resolve("${photo.id}.$ext").normalize()
        Files.createDirectories(path.parent)
        file.inputStream.use { input -> Files.copy(input, path) }

        photo.storagePath = path.toString()
        val saved = reportPhotoRepository.save(photo)
        return saved.toResponse(reportId)
    }

    @GetMapping("/reports/{reportId}/photos")
    fun list(@PathVariable reportId: UUID): List<ReportPhotoResponse> {
        val instructorId = instructorContext.currentInstructorId()
        val report = reportRepository.findByIdAndInstructorId(reportId, instructorId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found")
        return reportPhotoRepository.findByReportIdOrderByCreatedAtDesc(report.id!!).map { it.toResponse(report.id!!) }
    }

    @GetMapping("/reports/{reportId}/photos/{photoId}")
    fun openForInstructor(@PathVariable reportId: UUID, @PathVariable photoId: UUID): ResponseEntity<ByteArray> {
        val instructorId = instructorContext.currentInstructorId()
        val report = reportRepository.findByIdAndInstructorId(reportId, instructorId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found")
        val photo = reportPhotoRepository.findByIdAndReportId(photoId, report.id!!)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found")
        return openImage(photo)
    }

    @GetMapping("/share/{token}/photos/{photoId}")
    fun openForSharedView(@PathVariable token: String, @PathVariable photoId: UUID): ResponseEntity<ByteArray> {
        val share = reportShareRepository.findByToken(token)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Share not found")
        if (share.revoked || share.expiresAt!!.isBefore(Instant.now())) {
            throw ResponseStatusException(HttpStatus.GONE, "Share link expired")
        }

        val reportId = share.report!!.id!!
        val photo = reportPhotoRepository.findByIdAndReportId(photoId, reportId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found")
        return openImage(photo)
    }

    private fun openImage(photo: ReportPhoto): ResponseEntity<ByteArray> {
        val filePath = Paths.get(photo.storagePath ?: "")
        if (!Files.exists(filePath)) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "Photo file not found")
        }
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

    private fun ReportPhoto.toResponse(reportId: UUID) = ReportPhotoResponse(
        id = id!!,
        reportId = reportId,
        fileName = fileName ?: "photo",
        createdAt = createdAt ?: Instant.now(),
        imageUrl = "/api/v1/reports/$reportId/photos/$id"
    )
}

data class ReportPhotoResponse(
    val id: UUID,
    val reportId: UUID,
    val fileName: String,
    val createdAt: Instant,
    val imageUrl: String
)
