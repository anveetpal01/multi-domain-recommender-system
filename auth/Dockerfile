# ---- Build stage ----
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app
COPY . .
RUN chmod +x mvnw && ./mvnw -B clean package -DskipTests

# ---- Run stage ----
FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# Render sets the PORT env var; our app reads ${PORT}. MaxRAMPercentage keeps
# memory within Render's free 512 MB.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
