export const APP_NAME    = 'AutoCrew';
export const APP_TAGLINE = 'Car Accessories Installer & Seller Management';

export const PRODUCT_CATEGORIES = [
  'Audio & Entertainment','Car Alarms & Security','Dash Cameras',
  'Tints & Films','Seat Covers & Upholstery','Lighting (LED/HID)',
  'Wheels & Tires','Suspension & Liftkits','Roof Racks & Cargo',
  'Body Kits & Exterior','Engine & Performance','Electrical & Wiring',
  'GPS & Tracking','Parking Sensors & Cameras','Floor Mats & Accessories',
  'Tools & Supplies','Other',
];

export const JOB_TYPES = [
  'Audio Installation','Alarm / Security Installation','Dash Cam Installation',
  'Window Tinting','Seat Cover Installation','LED / HID Lighting',
  'Wheel & Tire Fitting','Suspension Setup','Roof Rack Installation',
  'Body Kit Fitting','GPS Tracker Installation','Parking Sensor Installation',
  'General Accessory Installation','Removal / Uninstall','Repair / Rewiring','Other',
];

export const CAR_MAKES = [
  'Toyota','Honda','Mitsubishi','Nissan','Ford','Chevrolet',
  'Hyundai','Kia','Suzuki','Isuzu','Mazda','Subaru',
  'BMW','Mercedes-Benz','Audi','Volkswagen','Lexus',
  'Land Rover','Jeep','RAM','Other',
];

export const ROLES = {
  SUPER_ADMIN:'super_admin', BRANCH_MANAGER:'branch_manager',
  SALES_STAFF:'sales_staff', INSTALLER:'installer',
};

export const ROLE_LABELS = {
  super_admin:'Super Admin', branch_manager:'Branch Manager',
  sales_staff:'Sales Staff', installer:'Installer',
};

export const JOB_STATUSES = {
  pending:    { label:'Pending',     cls:'bg-gray-100 text-gray-600',      dot:'bg-gray-400'    },
  assigned:   { label:'Assigned',    cls:'bg-blue-100 text-blue-700',      dot:'bg-blue-500'    },
  in_progress:{ label:'In Progress', cls:'bg-amber-100 text-amber-700',    dot:'bg-amber-500'   },
  completed:  { label:'Completed',   cls:'bg-emerald-100 text-emerald-700',dot:'bg-emerald-500' },
  cancelled:  { label:'Cancelled',   cls:'bg-red-100 text-red-600',        dot:'bg-red-400'     },
};

export const DELIVERY_STATUSES = {
  pending:   { label: 'Pending', cls: 'bg-gray-100 text-gray-600' },
  partial:   { label: 'Partial', cls: 'bg-amber-100 text-amber-700' },
  received:  { label: 'Received', cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-600' },
};

export const PAYMENT_METHODS = ['Cash','GCash','Maya','Bank Transfer','Credit Card','Installment','Other'];

export const PO_STATUSES = {
  draft:    { label:'Draft',     cls:'bg-gray-100 text-gray-600'      },
  ordered:  { label:'Ordered',   cls:'bg-blue-100 text-blue-700'      },
  partial:  { label:'Partial',   cls:'bg-amber-100 text-amber-700'    },
  received: { label:'Received',  cls:'bg-emerald-100 text-emerald-700' },
  cancelled:{ label:'Cancelled', cls:'bg-red-100 text-red-600'        },
};

export const PLANS = {
  starter:{ id:'starter',name:'Starter',priceMonthly:0, maxBranches:1,maxInstallers:1,maxProducts:30, maxTeam:5,
    features:['1 branch','1 installer','30 products','Jobs & invoicing','Basic reports'],color:'sky' },
  growth: { id:'growth', name:'Growth', priceMonthly:2499,maxBranches:3,maxInstallers:15,maxProducts:500, maxTeam:30,
    features:['Up to 3 branches','15 installers','500 products','Everything in Starter','Installer portal','Purchase orders','Delivery tracking','Sales reports'],color:'violet',popular:true },
  pro:    { id:'pro',    name:'Pro',    priceMonthly:4999,maxBranches:null,maxInstallers:null,maxProducts:null, maxTeam:null,
    features:['Unlimited branches','Unlimited installers','Unlimited products','Everything in Growth','Commission tracking','Advanced analytics','Priority support'],color:'amber' },
};

export const PLAN_LIST  = Object.values(PLANS);
export const TRIAL_DAYS = 14;
