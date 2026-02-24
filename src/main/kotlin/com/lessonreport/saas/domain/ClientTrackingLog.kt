package com.lessonreport.saas.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "client_tracking_logs")
open class ClientTrackingLog(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    open var id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "instructor_id", nullable = false)
    open var instructor: Instructor? = null,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "client_id", nullable = false)
    open var client: Client? = null,

    @Column(name = "pain_note", length = 1000)
    open var painNote: String? = null,

    @Column(name = "goal_note", length = 1000)
    open var goalNote: String? = null,

    @Column(name = "surgery_history", length = 1000)
    open var surgeryHistory: String? = null,

    @Column(name = "before_class_memo", length = 1000)
    open var beforeClassMemo: String? = null,

    @Column(name = "after_class_memo", length = 1000)
    open var afterClassMemo: String? = null,

    @Column(name = "next_lesson_plan", length = 1000)
    open var nextLessonPlan: String? = null,

    @Column(name = "homework_given", length = 1000)
    open var homeworkGiven: String? = null,

    @Column(name = "homework_reminder_at")
    open var homeworkReminderAt: Instant? = null,

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    open var createdAt: Instant? = null
)

