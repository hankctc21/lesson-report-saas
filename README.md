# lesson-report-saas

필라테스 강사용 레슨 리포트 SaaS MVP 백엔드 프로젝트입니다.  
`Spring Boot + Kotlin + PostgreSQL` 기반으로 구성되어 있습니다.

## 기술 스택
- Kotlin + Java 21 (LTS)
- Spring Boot 4.0.3
- Spring Security (JWT Bearer 인증)
- springdoc OpenAPI + Swagger UI
- Spring Data JPA + PostgreSQL
- Flyway 마이그레이션
- Gradle Wrapper (`./gradlew`)

## 프로젝트 구조
- `src/main/kotlin`: 애플리케이션 소스 코드
- `src/main/resources/db/migration`: Flyway SQL 마이그레이션
- `src/test/kotlin`: 테스트 코드
- `.github/workflows/ci.yml`: GitHub Actions CI

## 빠른 시작
1. PostgreSQL DB를 실행합니다.
```bash
docker compose up -d
```
2. 실행 환경변수(권장) 또는 `src/main/resources/application.yml` 값을 설정합니다.
3. 아래 명령으로 실행합니다.
```bash
./gradlew bootRun
```

DB 중지:
```bash
docker compose down
```

실행 후 기본 주소:
- API 서버: `http://localhost:18080`
- Swagger UI: `http://localhost:18080/swagger-ui/index.html`

## 환경변수
- `APP_AUTH_SECRET` (default: `change-this-jwt-secret-min-32-bytes`)
- `APP_AUTH_TOKEN_TTL_MINUTES` (default: `120`)
- `APP_DEFAULT_INSTRUCTOR_ID` (default: `11111111-1111-1111-1111-111111111111`)
- `APP_SHARE_BASE_URL` (default: `http://localhost:18080/api/v1/share`)

로그인 계정은 DB(`auth_users`)에서 관리됩니다.
기본 시드 계정:
- username: `admin`
- password: `change_this_in_prod`

DB 연결(Spring datasource):
- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`

## 빌드 및 테스트
```bash
./gradlew clean test build
```

## 프론트엔드 실행 (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

- 프론트 개발 서버: `http://localhost:5173`
- 백엔드 API 기본 포트: `http://localhost:18080`
- 필요 시 API 주소 변경: `frontend/.env`에 `VITE_API_BASE_URL=http://localhost:18080`

## 헬스 체크
- `GET /actuator/health` (public)
- `GET /actuator/info` (public)
- `GET /api/v1/ping` (JWT 필요)

## 인증 및 Swagger
- 로그인: `POST /api/v1/auth/login`
- Swagger UI: `GET /swagger-ui/index.html`
- OpenAPI JSON: `GET /v3/api-docs`
- 로그인 후 발급된 `accessToken`을 `Authorization: Bearer <token>` 헤더로 전달하세요.

예시 (터미널):
```bash
# 1) 로그인해서 JWT 발급
curl -s -X POST http://localhost:18080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"change_this_in_prod"}'

# 응답의 accessToken 값을 복사
TOKEN=여기에_JWT_토큰

# 2) 인증이 필요한 API 호출
curl -s http://localhost:18080/api/v1/clients \
  -H "Authorization: Bearer $TOKEN"
```

## 로직 수행 흐름
1. 로그인
- 클라이언트가 `POST /api/v1/auth/login` 호출
- 서버가 `APP_AUTH_USERNAME / APP_AUTH_PASSWORD`와 비교
- 일치하면 JWT 발급 (`instructorId` claim 포함)

2. 인증 필터 처리
- 인증이 필요한 API 요청 시 `Authorization: Bearer <JWT>` 전달
- `JwtAuthenticationFilter`가 토큰을 검증하고 SecurityContext에 사용자 정보 저장

3. 강사 컨텍스트 확정
- `InstructorContext`가 SecurityContext의 principal에서 `instructorId`를 읽음
- 이후 조회/생성/수정은 이 `instructorId` 기준으로 데이터 접근

4. 핵심 API 처리
- `clients`: 회원 생성/조회/수정
- `sessions`: 수업 세션 생성/날짜별 조회
- `reports`: 세션 기반 리포트 작성/조회/수정
- `share`: 리포트 공유 토큰 발급 및 공개 조회

5. 공유 링크 동작
- `POST /api/v1/reports/{reportId}/share`로 토큰 생성(만료시간 포함)
- 회원이 `GET /api/v1/share/{token}` 접근 시 만료/폐기 여부 확인 후 리포트 열람
- 조회 시 `viewCount`, `lastViewedAt` 갱신

## 실제 실행 순서(권장)
1. 앱 실행: `./gradlew bootRun`
2. Swagger 접속: `http://localhost:18080/swagger-ui/index.html`
3. `POST /api/v1/auth/login` 실행 후 토큰 획득
4. Swagger 우측 상단 `Authorize`에 `Bearer <토큰>` 입력
5. `clients -> sessions -> reports -> share` 순서로 기능 테스트

## 프론트 UX 보강 사항
- 리포트 등록 시 `세션별 리포트 존재 여부`를 표시합니다.
- 이미 리포트가 있는 세션은 기본적으로 선택 목록에서 제외됩니다.
- `원클릭 초안` 버튼으로 리포트 문구를 자동 채울 수 있습니다.
- 각 입력칸의 `음성` 버튼으로 브라우저 음성 인식 입력을 사용할 수 있습니다(지원 브라우저 한정).
- 리포트 저장 성공 시 최신 `reportId`가 자동 표시되고 공유 대상에 자동 연결됩니다.

## MVP API
- `GET /api/v1/clients`
- `POST /api/v1/clients`
- `GET /api/v1/clients/{clientId}`
- `PATCH /api/v1/clients/{clientId}`
- `POST /api/v1/sessions`
- `GET /api/v1/sessions?date=YYYY-MM-DD`
- `GET /api/v1/sessions/with-report?date=YYYY-MM-DD`
- `POST /api/v1/reports`
- `GET /api/v1/reports/{reportId}`
- `PATCH /api/v1/reports/{reportId}`
- `GET /api/v1/clients/{clientId}/reports?limit=20`
- `POST /api/v1/reports/{reportId}/share`
- `GET /api/v1/share/{token}` (public)

## 참고 사항
- Flyway `V1`에서 기본 Instructor 1건을 시드 데이터로 생성합니다.
- Flyway `V2`에서 로그인 계정(`auth_users`) 기본값 `admin / change_this_in_prod`를 시드합니다.
- Flyway `V3`에서 데모 회원/세션/리포트 테스트 데이터를 시드합니다.
- CI는 `main` 브랜치 Push/PR 시 자동 실행됩니다.
- 운영 환경에서는 현재 단일 계정 JWT 부트스트랩에서 사용자/권한 기반 JWT(OAuth2/OIDC 포함)로 확장하는 것을 권장합니다.

## IntelliJ
이 폴더를 그대로 Gradle 프로젝트로 열면 됩니다.  
별도 IntelliJ 프로젝트를 새로 만들 필요는 없습니다.
