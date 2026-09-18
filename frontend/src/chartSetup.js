import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'

ChartJS.register(BarController, LineController, BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Legend, Tooltip)
