import {Router} from 'express';
import {PrismaClient} from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
const router = Router();


router.post('/', async (req, res) => {
    const {templateName, questions} = req.body;

    if (!templateName || !Array.isArray(questions)) {
        return res.status(400).json({error: 'Invalid request body'});
    }

    try {
        const templateID = Date.now() // generate a shared template ID based on timestamp

        // loop over the questions of same template and save each question with same templateID
        for(const question of questions){
            const questionHash = crypto.createHash('sha256').update(JSON.stringify(question)).digest('hex');

            await prisma.questionnaireTemplate.create({
                data: {
                    id: templateID,
                    templateName,
                    questionText: JSON.stringify(question),
                    questionHash
                }
            });
        }
        res.json({ok:true});
    }catch(error){
        console.error('Error creating questionnaire template:', error);
        res.status(500).json({error: 'Internal server error'});
    }
});

export default router;

router.get('/:templateID', async (req, res) => {
    const templateID = Number(req.params.templateID);

    if(isNaN(templateID)){
        return res.status(400).json({error: 'Invalid template ID'});
    }

    try{
        const questions = await prisma.questionnaireTemplate.findMany({
            where: {id: templateID},
            orderBy: {createdAt: 'asc'}
        });

        if(questions.length === 0){
            return res.status(404).json({error: 'Template nt found'});
        }

        const formattedQuestions = questions.map(q => JSON.parse(q.questionText));

        res.json({
            templateID,
            templateName: questions[0].templateName,
            questions: formattedQuestions
        });
    }catch(error){
        console.error('Error fetching questionnaire template:', error);
        res.status(500).json({error: 'Internal server error'});
    }
});
