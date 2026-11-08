package com.bigpapa.reports;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class ReportDtos {
    private ReportDtos() {}
    public record Summary(LocalDate from, LocalDate to, long tripCount,
        BigDecimal income, BigDecimal fuelExpenses, BigDecimal otherExpenses,
        BigDecimal driverPay, BigDecimal totalCosts, BigDecimal profit,
        BigDecimal driverAdvances, BigDecimal driverDeductions, BigDecimal driverBalance,
        List<VehicleBreakdown> byVehicle, List<DriverBreakdown> byDriver, List<DailyBreakdown> byDay) {}
    public record VehicleBreakdown(UUID vehicleId,String registration,long trips,BigDecimal income,BigDecimal costs,BigDecimal profit) {}
    public record DriverBreakdown(UUID driverId,String driver,long trips,BigDecimal grossPay,BigDecimal advances,BigDecimal deductions,BigDecimal balance) {}
    public record DailyBreakdown(LocalDate date,long trips,BigDecimal income,BigDecimal costs,BigDecimal profit) {}
}
