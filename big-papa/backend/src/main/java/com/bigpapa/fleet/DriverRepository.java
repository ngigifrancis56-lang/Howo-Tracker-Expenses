package com.bigpapa.fleet;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface DriverRepository extends JpaRepository<Driver, UUID> {
    boolean existsByLicenceNumberIgnoreCase(String licenceNumber);
}
