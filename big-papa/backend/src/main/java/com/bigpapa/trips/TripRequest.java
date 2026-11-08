package com.bigpapa.trips;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record TripRequest(
    @NotNull LocalDate tripDate,
    @NotNull UUID vehicleId,
    @NotNull UUID driverId,
    @NotBlank @Size(max=60) String cargoType,
    @Size(max=120) String origin,
    @Size(max=120) String destination,
    @NotNull @DecimalMin("0.00") BigDecimal income,
    @NotNull @DecimalMin("0.00") BigDecimal fuelExpense,
    @NotNull @DecimalMin("0.00") BigDecimal otherExpenses,
    @NotNull @DecimalMin("0.00") BigDecimal driverPay,
    @NotNull @DecimalMin("0.00") BigDecimal driverAdvance,
    @NotNull @DecimalMin("0.00") BigDecimal driverDeduction,
    @Size(max=2000) String notes
) {}
