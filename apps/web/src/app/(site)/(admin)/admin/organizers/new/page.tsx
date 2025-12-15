
import { OrganizerForm } from '../organizer-form'

export default function NewOrganizerPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Create Organizer</h2>
                <p className="text-muted-foreground">Add a new course organizer</p>
            </div>
            <OrganizerForm />
        </div>
    )
}
