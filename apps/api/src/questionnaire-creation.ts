import {Router} from 'express';
import {PrismaClient} from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
const router = Router();

const isValidPayload = (body: any) => body?.templateName && Array.isArray(body?.questions);

const persistTemplate = async (templateName: string, questions: unknown[]) => {
    const templateID = Date.now(); // generate a shared template ID based on timestamp
    for (const question of questions) {
        const questionHash = crypto.createHash('sha256').update(JSON.stringify(question)).digest('hex');
        await prisma.questionnaireTemplate.create({
            data: { id: templateID, templateName, questionText: JSON.stringify(question), questionHash },
        });
    }
};

router.post('/', async (req, res) => {
    const {templateName, questions} = req.body;

    if (!isValidPayload(req.body)) {
        return res.status(400).json({error: 'Invalid request body'});
    }

    try {
        await persistTemplate(templateName, questions);
        res.json({ok:true});
    }catch(error){
        console.error('Error creating questionnaire template:', error);
        res.status(500).json({error: 'Internal server error'});
    }
});

export default router;
