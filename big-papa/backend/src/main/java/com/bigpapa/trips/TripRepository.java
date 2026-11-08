package com.bigpapa.trips;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
public interface TripRepository extends JpaRepository<Trip,UUID> {
    java.util.Optional<Trip> findByClientRequestId(UUID clientRequestId);
    List<Trip> findAllByOrderByTripDateDescCreatedAtDesc();
    List<Trip> findByTripDateBetweenOrderByTripDateDesc(LocalDate from,LocalDate to);
}
