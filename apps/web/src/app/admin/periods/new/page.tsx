
import { PeriodForm } from '../period-form'

export default function NewPeriodPage() {
    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">New Course Period</h2>
            </div>
            <PeriodForm />
        </div>
    )
}
