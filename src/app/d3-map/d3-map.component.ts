import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, HostListener, Inject, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SalesMapCircleModel } from '../models/salesMapCircle.model';
import { TotalInfoSalesMap } from '../models/totalInfoSalesMap.model';
import * as _ from 'lodash';
import * as d3 from 'd3';

@Component({
  selector: 'app-d3-map',
  templateUrl: './d3-map.component.html',
  styleUrls: ['./d3-map.component.scss'],
})
export class D3MapComponent implements OnInit {
  public orders: SalesMapCircleModel[] = [];
  public users: SalesMapCircleModel[] = [];
  // Canvas for explosion animation
  @ViewChild('canvas', { static: true })
  public canvas!: ElementRef<HTMLCanvasElement>;
  // Canvas for display dots
  @ViewChild('canvas2', { static: true })
  public canvas2!: ElementRef<HTMLCanvasElement>;
  public ctx!: CanvasRenderingContext2D | null;
  public ctx2!: CanvasRenderingContext2D | null;
  public times: number = 5783.333 / 1280;
  public tempUsers: SalesMapCircleModel[] = [];
  public tempOrders: SalesMapCircleModel[] = [];
  public warehouses = [];
  public projection: any;
  public orderTimer: number = 0;
  public signupTimer: number = 0;
  // animation config
  public lineWidth: number = 3;
  public opacity: number = 1;
  public opacity2: number = 1;
  public radius: number = 3;
  public maxRadius: number = 30;
  public insideSpeed: number = 0.5;
  public outsideSpeed: number = 0.3;
  public lastUpdate!: string;
  public ordersStartingAmountDay: number = 1000;
  public ordersStartingAmountWeek: number = 1000;
  public usersStartingAmountDay: number = 1000;
  public usersStartingAmountWeek: number = 1000;
  // properties for resize functionality
  public fullScreenStyle: any = {};
  public expand = false;
  public canvasSize: any = {
    height: 853,
    width: 1280,
  };
  public zoom: number = 2;

  // public translation: any = {
  //   ordersToday: '',
  //   ordersThisWeek: '',
  //   signupsThisWeek: '',
  //   OrdersToday: '',
  // };
  public totalInfo!: TotalInfoSalesMap;
  public elem: any;
  @HostListener('document:fullscreenchange', ['$event'])
  @HostListener('document:webkitfullscreenchange', ['$event'])
  @HostListener('document:mozfullscreenchange', ['$event'])
  @HostListener('document:MSFullscreenChange', ['$event'])
  public screenChange(): void {
    if (
      this.document.fullscreen ||
      this.document.webkitCurrentFullScreenElement
    ) {
      this.zoom = window.innerHeight / 853;
      this.fullScreenStyle = {
        left:
          ((window.innerWidth - window.innerHeight * 1.5) / 2).toString() +
          'px',
        position: 'fixed',
        top: '0',
        transform: `scale(${this.zoom})`,
        '-moz-transform': `scale(${this.zoom})`,
      };
    } else {
      this.expand = false;
      this.fullScreenStyle = {
        left: 'unset',
        position: 'relative',
        zoom: 1,
      };
    }
  }
  constructor(
    private readonly activeRoute: ActivatedRoute,
    @Inject(DOCUMENT) private document: any,
  ) {}

  public ngOnInit(): void {
    this.elem = document.documentElement;
    // Set up canvas container
    this.ctx = this.canvas.nativeElement.getContext('2d');
    this.ctx2 = this.canvas2.nativeElement.getContext('2d');
    // Define math projection
    this.projection = d3
      .geoNaturalEarth1()
      .scale(1100)
      .translate([5783.333 / 2.15, 3855.556 / 2]);
    // Load orders, users
    this.loadData();
    // this.getTranslations();
  }
  public animation(): void {
    // cycle function
    const id: number = requestAnimationFrame(this.animation.bind(this));
    this.ctx?.clearRect(
      0,
      0,
      this.canvas.nativeElement.width,
      this.canvas.nativeElement.height
    );
    if (this.tempUsers.length === 0) {
      this.tempUsers.push(..._.cloneDeep(this.users));
    }
    this.modifyCircle(this.tempUsers, '226, 193, 251', 'signup');

    if (this.tempOrders.length === 0) {
      this.tempOrders.push(..._.cloneDeep(this.orders));
    }
    this.modifyCircle(this.tempOrders, '255, 193, 7', 'order');

    this.tempUsers = this.tempUsers.filter((user) => {
      return !user.complete;
    });
    this.tempOrders = this.tempOrders.filter((user) => {
      return !user.complete;
    });
    // Reset counting when numbers exceed
    if (
      this.orderTimer >
      (this.totalInfo.ordersToday <= 1000 ? this.totalInfo.ordersToday : 1000)
    ) {
      this.orderTimer = 0;
      // clear dot's canvas
      this.ctx2?.clearRect(
        0,
        0,
        this.canvas.nativeElement.width,
        this.canvas.nativeElement.height
      );
    }
    if (
      this.signupTimer >
      (this.totalInfo.signupsToday <= 1000 ? this.totalInfo.signupsToday : 1000)
    ) {
      this.signupTimer = 0;
    }
  }
  public loadData(): void {
    // Retrieve data from resolver
    this.orders = this.activeRoute.snapshot.data['data'].ordersInfo;
    this.users = this.activeRoute.snapshot.data['data'].usersInfo;
    this.totalInfo = this.activeRoute.snapshot.data['data'].totalInfo;
    this.count();
    // Set up users objects
    this.users = this.users.map((el: SalesMapCircleModel) => {
      const coordinates: number[] = this.projection([
        el.longitude,
        el.latitude,
      ]);
      el.x = coordinates[0] / this.times;
      el.y = coordinates[1] / this.times;
      el.r1 = 3;
      el.r2 = 3;
      el.op1 = 1;
      el.op2 = 1;
      el.complete = false;
      el.next = false;
      return el;
    });
    // Set up orders objects
    this.orders = this.orders.map((el: SalesMapCircleModel) => {
      const coordinates: number[] = this.projection([
        el.longitude,
        el.latitude,
      ]);
      el.x = coordinates[0] / this.times;
      el.y = coordinates[1] / this.times;
      el.r1 = 3;
      el.r2 = 3;
      el.op1 = 1;
      el.op2 = 1;
      el.complete = false;
      el.next = false;
      return el;
    });
    // Start animation
    this.animation();
  }
  public drawDot(centerX: number, centerY: number, color: string): void {
    if (!this.ctx2) return;
    this.ctx2.beginPath();
    this.ctx2.arc(centerX, centerY, 1.5, 0, 2 * Math.PI);
    this.ctx2.fillStyle = color;
    this.ctx2.fill();
  }
  public drawCircle(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    style: string,
    typeOfCircle: string
  ): void {
    ctx.strokeStyle = style;
    ctx.lineWidth = this.lineWidth;
    ctx.shadowBlur = radius / 5;
    ctx.shadowColor = typeOfCircle === 'order' ? '#FFC107' : '#E2C1FB';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  public modifyCircle(
    data: SalesMapCircleModel[],
    color: string,
    typeOfCircle: string
  ): void {
    data.forEach((user, i) => {
      if (i === 0 || data[i - 1].next) {
        // extend outside circle
        user.r1 += this.insideSpeed;
        this.drawCircle(
          this.ctx!,
          user.x,
          user.y,
          user.r1,
          `rgba(${color},${user.op1})`,
          typeOfCircle
        );
        if (user.r2 >= this.maxRadius * 0.75) {
          user.op2 -= 0.05;
          if (user.op2 < 0) {
            user.complete = true;
            // logic to count numbers up
            typeOfCircle === 'order'
              ? (this.orderTimer += 1)
              : (this.signupTimer += 1);
            this.drawDot(user.x, user.y, `rgba(${color},1)`);
          }
        }

        if (user.r1 >= this.maxRadius * 0.5) {
          this.drawCircle(
            this.ctx!,
            user.x,
            user.y,
            user.r2,
            `rgba(${color},${user.op2})`,
            typeOfCircle
          );
          // extend inside circle
          user.r2 += this.outsideSpeed;
        }

        if (user.r1 >= this.maxRadius * 0.75) {
          user.op1 -= 0.05;
        }
        if (user.r1 >= this.maxRadius) {
          user.next = true;
        }
      }
    });
  }
  public reSize(expand: boolean): void {
    this.expand = expand;
    if (!expand) {
      this.closeFullscreen();
      this.fullScreenStyle = {
        left: 'unset',
        position: 'relative',
        zoom: 1,
      };
    } else {
      this.fullScreen();
    }
  }
  public fullScreen(): any {
    if (this.elem.requestFullscreen) {
      this.elem.requestFullscreen();
    } else if (this.elem.mozRequestFullScreen) {
      /* Firefox */
      this.elem.mozRequestFullScreen();
    } else if (this.elem.webkitRequestFullscreen) {
      /* Chrome, Safari and Opera */
      this.elem.webkitRequestFullscreen();
    } else if (this.elem.msRequestFullscreen) {
      /* IE/Edge */
      this.elem.msRequestFullscreen();
    }
  }
  public closeFullscreen(): void {
    if (this.document.exitFullscreen) {
      this.document.exitFullscreen().catch((err: any) => Promise.resolve(err));
    } else if (this.document.mozCancelFullScreen) {
      /* Firefox */
      this.document.mozCancelFullScreen();
    } else if (this.document.webkitExitFullscreen) {
      /* Chrome, Safari and Opera */
      this.document.webkitExitFullscreen();
    } else if (this.document.msExitFullscreen) {
      /* IE/Edge */
      this.document.msExitFullscreen();
    }
  }
  // In case we pull less then 1000 records from db
  public count(): void {
    this.ordersStartingAmountDay =
      this.totalInfo.ordersToday -
      (this.totalInfo.ordersToday <= 1000 ? this.totalInfo.ordersToday : 1000);
    this.ordersStartingAmountWeek =
      this.totalInfo.ordersThisWeek -
      (this.totalInfo.ordersToday <= 1000 ? this.totalInfo.ordersToday : 1000);
    this.usersStartingAmountDay =
      this.totalInfo.signupsToday -
      (this.totalInfo.signupsToday <= 1000
        ? this.totalInfo.signupsToday
        : 1000);
    this.usersStartingAmountWeek =
      this.totalInfo.signupsThisWeek -
      (this.totalInfo.signupsToday <= 1000
        ? this.totalInfo.signupsToday
        : 1000);
  }

}
