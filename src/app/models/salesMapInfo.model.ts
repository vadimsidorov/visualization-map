import { CoordinatesModel } from './coordinates.model';
import { TotalInfoSalesMap } from './totalInfoSalesMap.model';

export interface SalesMapInfo {
    usersInfo: CoordinatesModel[];
    ordersInfo: CoordinatesModel[];
    totalInfo:  TotalInfoSalesMap;
}