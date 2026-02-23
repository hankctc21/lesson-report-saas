package com.lessonreport.saas

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
class LessonReportSaasApplication

fun main(args: Array<String>) {
    runApplication<LessonReportSaasApplication>(*args)
}
