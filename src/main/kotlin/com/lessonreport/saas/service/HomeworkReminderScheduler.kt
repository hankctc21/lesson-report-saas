package com.lessonreport.saas.service

import com.lessonreport.saas.repository.HomeworkAssignmentRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Instant

@Component
class HomeworkReminderScheduler(
    private val homeworkAssignmentRepository: HomeworkAssignmentRepository,
    private val homeworkReminderSender: HomeworkReminderSender
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Scheduled(fixedDelayString = "\${app.homework-reminder-poll-ms:60000}")
    fun notifyDueHomeworks() {
        val now = Instant.now()
        val due = homeworkAssignmentRepository
            .findByRemindAtLessThanEqualAndNotifiedAtIsNullAndCompletedFalse(now)

        due.forEach {
            val clientName = it.client?.name ?: "회원"
            val content = it.content ?: ""
            val sent = homeworkReminderSender.send(clientName, content, it.remindAt)
            if (sent) {
                it.notifiedAt = now
                homeworkAssignmentRepository.save(it)
            }
        }

        if (due.isNotEmpty()) {
            log.info("Processed homework reminders: {}", due.size)
        }
    }
}
