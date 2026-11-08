package com.bigpapa.reports;

import com.bigpapa.trips.Trip;
import com.bigpapa.trips.TripRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import static com.bigpapa.reports.ReportDtos.*;

@RestController
@RequestMapping("/api/reports")
public class ReportController {
    private final TripRepository trips;
    public ReportController(TripRepository trips){this.trips=trips;}

    @GetMapping
    public Summary report(
        @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate end=to==null?LocalDate.now():to;
        LocalDate start=from==null?end.withDayOfMonth(1):from;
        if(end.isBefore(start))throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"End date must be on or after start date.");
        List<Trip> rows=trips.findByTripDateBetweenOrderByTripDateDesc(start,end);
        BigDecimal income=sum(rows,Trip::getIncome),fuel=sum(rows,Trip::getFuelExpense),other=sum(rows,Trip::getOtherExpenses),pay=sum(rows,Trip::getDriverPay);
        BigDecimal costs=fuel.add(other).add(pay);
        BigDecimal advances=sum(rows,Trip::getDriverAdvance),deductions=sum(rows,Trip::getDriverDeduction);
        List<VehicleBreakdown> vehicles=rows.stream().collect(Collectors.groupingBy(Trip::getVehicleId,Collectors.toList())).entrySet().stream().map(e->{
            List<Trip> group=e.getValue();return new VehicleBreakdown(e.getKey(),group.get(0).getVehicleRegistration(),group.size(),sum(group,Trip::getIncome),cost(group),sum(group,Trip::getProfit));
        }).sorted(Comparator.comparing(VehicleBreakdown::profit).reversed()).toList();
        List<DriverBreakdown> drivers=rows.stream().collect(Collectors.groupingBy(Trip::getDriverId,Collectors.toList())).entrySet().stream().map(e->{
            List<Trip> group=e.getValue();return new DriverBreakdown(e.getKey(),group.get(0).getDriverName(),group.size(),sum(group,Trip::getDriverPay),sum(group,Trip::getDriverAdvance),sum(group,Trip::getDriverDeduction),group.stream().map(Trip::getDriverBalance).reduce(BigDecimal.ZERO,BigDecimal::add));
        }).sorted(Comparator.comparing(DriverBreakdown::driver)).toList();
        Map<LocalDate,List<Trip>> days=rows.stream().collect(Collectors.groupingBy(Trip::getTripDate));
        List<DailyBreakdown> daily=days.entrySet().stream().map(e->new DailyBreakdown(e.getKey(),e.getValue().size(),sum(e.getValue(),Trip::getIncome),cost(e.getValue()),sum(e.getValue(),Trip::getProfit))).sorted(Comparator.comparing(DailyBreakdown::date)).toList();
        return new Summary(start,end,rows.size(),income,fuel,other,pay,costs,income.subtract(costs),advances,deductions,pay.subtract(advances).subtract(deductions),vehicles,drivers,daily);
    }
    private static BigDecimal cost(List<Trip> rows){return sum(rows,Trip::getTotalExpenses).add(sum(rows,Trip::getDriverPay));}
    private static BigDecimal sum(List<Trip> rows,java.util.function.Function<Trip,BigDecimal> field){return rows.stream().map(field).filter(Objects::nonNull).reduce(BigDecimal.ZERO,BigDecimal::add);}
}
